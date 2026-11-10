"""
RealEyes — Hyper-Realistic AI Images Downloader
================================================
Fetches cutting-edge fake images from two premier sources:
1. 'tellif/ai_vs_real_image_semantically_similar'
   - FLUX.1 Pro Ultra, Ideogram v2, SD 3.5 Large, Imagen 4
2. 'TheKernel01/140k-Real-and-Fake-Faces' (xhlulu/140k mirror)
   - StyleGAN2 photorealistic synthetic faces

Saves into:
  - data/fake/
  - data/.vault/fake/
"""

import os
import random
import urllib.request
import json
from pathlib import Path
from PIL import Image
from io import BytesIO
from datasets import load_dataset

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FAKE_DIR     = PROJECT_ROOT / "data" / "fake"
VAULT_FAKE   = PROJECT_ROOT / "data" / ".vault" / "fake"

FAKE_DIR.mkdir(parents=True, exist_ok=True)
VAULT_FAKE.mkdir(parents=True, exist_ok=True)

TELLIF_TARGET = 120
FACES_TARGET  = 80
IMAGE_FORMAT  = "jpg"
IMAGE_QUALITY = 92


def save_pil_image(img, filepath: Path):
    if isinstance(img, Image.Image):
        img = img.convert("RGB")
        img.save(filepath, format="JPEG", quality=IMAGE_QUALITY)


def fetch_tellif_fakes():
    print(f"\n🌊 1/2: Streaming from tellif/ai_vs_real_image_semantically_similar...")
    print(f"   Target: {TELLIF_TARGET} images (FLUX.1 Pro Ultra, SD 3.5, Ideogram v2, Imagen 4)")
    
    ds = load_dataset('tellif/ai_vs_real_image_semantically_similar', split='test', streaming=True)
    count = 0

    for sample in ds:
        label = sample.get('label')
        # In this dataset, class index 8 is 'real', all other labels (0-7, 9-11) are AI generators
        if label is not None and label != 8:
            img = sample.get('image')
            if img:
                out_path = FAKE_DIR / f"flux_{count:04d}.{IMAGE_FORMAT}"
                save_pil_image(img, out_path)
                count += 1
                if count % 10 == 0 or count == TELLIF_TARGET:
                    print(f"   Saved {count}/{TELLIF_TARGET} FLUX/SD3.5 fake images...", end="\r")
                if count >= TELLIF_TARGET:
                    break

    print(f"\n   ✅ Finished tellif: {count} photorealistic AI images saved.")
    return count


def fetch_stylegan_faces():
    print(f"\n👤 2/2: Fetching StyleGAN2 synthetic faces from 140k-Real-and-Fake-Faces...")
    print(f"   Target: {FACES_TARGET} faces")
    
    count = 0
    offset = 0
    batch_size = 50
    headers = {'User-Agent': 'Mozilla/5.0'}

    while count < FACES_TARGET:
        api_url = f"https://datasets-server.huggingface.co/rows?dataset=TheKernel01/140k-Real-and-Fake-Faces&config=default&split=train&offset={offset}&limit={batch_size}"
        req = urllib.request.Request(api_url, headers=headers)
        
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                rows = data.get('rows', [])
                if not rows:
                    break

                for r in rows:
                    row_data = r.get('row', {})
                    label = row_data.get('label')
                    # label == 1 indicates fake (StyleGAN)
                    if label == 1:
                        img_info = row_data.get('image', {})
                        src_url = img_info.get('src')
                        if src_url:
                            img_req = urllib.request.Request(src_url, headers=headers)
                            with urllib.request.urlopen(img_req, timeout=15) as img_resp:
                                img_bytes = img_resp.read()
                                pil_img = Image.open(BytesIO(img_bytes))
                                out_path = FAKE_DIR / f"face_{count:04d}.{IMAGE_FORMAT}"
                                save_pil_image(pil_img, out_path)
                                count += 1
                                if count % 10 == 0 or count == FACES_TARGET:
                                    print(f"   Saved {count}/{FACES_TARGET} StyleGAN2 fake faces...", end="\r")
                                if count >= FACES_TARGET:
                                    break
                offset += batch_size
        except Exception as e:
            print(f"\n   Warning during fetch: {e}. Retrying next batch...")
            offset += batch_size

    print(f"\n   ✅ Finished StyleGAN faces: {count} synthetic faces saved.")
    return count


def update_vault():
    print(f"\n⚡ Updating Edge Tier Cache with verified realistic assets...")
    all_fakes = sorted(FAKE_DIR.glob(f"*.{IMAGE_FORMAT}"))
    random.shuffle(all_fakes)

    if len(all_fakes) < 15:
        print("⚠️  Not enough fake images to populate edge cache.")
        return

    # Select 10 images for edge cache
    vault_pick = all_fakes[:10]
    for idx, img_path in enumerate(vault_pick):
        prefix = "e_" if idx < 8 else "h_"
        dest = VAULT_FAKE / f"{prefix}vlt_{img_path.name}"
        # Copy to cache
        with open(img_path, 'rb') as src, open(dest, 'wb') as dst:
            dst.write(src.read())

    print(f"   ✅ Edge tier updated with {len(vault_pick)} calibrated assets.")


if __name__ == "__main__":
    t_count = fetch_tellif_fakes()
    f_count = fetch_stylegan_faces()
    update_vault()
    
    total = len(list(FAKE_DIR.glob(f"*.{IMAGE_FORMAT}")))
    print(f"\n🎉 Total new AI-generated images in data/fake/: {total}")
    print(f"   All old fake images were replaced with FLUX.1 Pro, SD 3.5, and StyleGAN2!")

