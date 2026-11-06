"""
RealEyes — State-of-the-Art Photorealistic Dataset Downloader
=============================================================
Streams photorealistic, semantically-paired images from:
  'tellif/ai_vs_real_image_semantically_similar'

Features cutting-edge generative models:
  - FLUX.1 Pro Ultra
  - Ideogram v2
  - Imagen 4 Preview
  - Stable Diffusion 3.5 Large
  - Gemini 2.5 Flash Image
  Versus real high-grade authentic photography.

Usage:
  python3 scripts/download_photorealistic_dataset.py
"""

import os
import random
from pathlib import Path
from datasets import load_dataset
from PIL import Image

# ── Configuration ──────────────────────────────────────────────────────────
DATASET_ID    = "tellif/ai_vs_real_image_semantically_similar"
DATASET_SPLIT = "test"
REAL_TARGET   = 200
FAKE_TARGET   = 200
BUFFER_SIZE   = 30
IMAGE_FORMAT  = "jpg"
IMAGE_QUALITY = 92

# Resolve paths
SCRIPT_DIR   = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
REAL_DIR     = PROJECT_ROOT / "data" / "real"
FAKE_DIR     = PROJECT_ROOT / "data" / "fake"
VAULT_REAL   = PROJECT_ROOT / "data" / ".vault" / "real"
VAULT_FAKE   = PROJECT_ROOT / "data" / ".vault" / "fake"

# Class index 8 is 'real', all other indices are modern AI generators
REAL_CLASS_INDEX = 8


def ensure_dirs():
    REAL_DIR.mkdir(parents=True, exist_ok=True)
    FAKE_DIR.mkdir(parents=True, exist_ok=True)
    VAULT_REAL.mkdir(parents=True, exist_ok=True)
    VAULT_FAKE.mkdir(parents=True, exist_ok=True)
    print(f"📁 Real Directory:  {REAL_DIR}")
    print(f"📁 Fake Directory:  {FAKE_DIR}")
    print(f"🔒 Vault Directory: {VAULT_REAL.parent}")


def save_image(img, dest_dir: Path, index: int, prefix: str = ""):
    filename = f"{prefix}photo_{index:04d}.{IMAGE_FORMAT}"
    filepath = dest_dir / filename
    if isinstance(img, Image.Image):
        img = img.convert("RGB")
        img.save(filepath, format="JPEG", quality=IMAGE_QUALITY)
    return filepath


def flush_buffer(buffer: list, dest_dir: Path, counter: int) -> int:
    random.shuffle(buffer)
    for img in buffer:
        save_image(img, dest_dir, counter)
        counter += 1
    buffer.clear()
    return counter


def download():
    ensure_dirs()

    print(f"\n🔄 Streaming photorealistic dataset: {DATASET_ID}")
    print(f"   Target: {REAL_TARGET} real + {FAKE_TARGET} AI images (FLUX.1 Pro, SD 3.5, Ideogram v2)\n")

    dataset = load_dataset(DATASET_ID, split=DATASET_SPLIT, streaming=True)

    real_saved = 0
    fake_saved = 0

    real_buffer = []
    fake_buffer = []

    total_scanned = 0

    for sample in dataset:
        if real_saved >= REAL_TARGET and fake_saved >= FAKE_TARGET:
            print(f"\n✅ Target reached! Scanned {total_scanned} samples.")
            break

        total_scanned += 1
        label = sample.get("label")
        img   = sample.get("image")

        if label is None or img is None:
            continue

        # label == 8 is 'real'
        if label == REAL_CLASS_INDEX and real_saved < REAL_TARGET:
            real_buffer.append(img)
            if len(real_buffer) >= BUFFER_SIZE:
                real_saved = flush_buffer(real_buffer, REAL_DIR, real_saved)
                print(f"   [Streaming] Real: {real_saved}/{REAL_TARGET}  |  AI: {fake_saved}/{FAKE_TARGET}", end="\r")

        # any other label is AI-generated
        elif label != REAL_CLASS_INDEX and fake_saved < FAKE_TARGET:
            fake_buffer.append(img)
            if len(fake_buffer) >= BUFFER_SIZE:
                fake_saved = flush_buffer(fake_buffer, FAKE_DIR, fake_saved)
                print(f"   [Streaming] Real: {real_saved}/{REAL_TARGET}  |  AI: {fake_saved}/{FAKE_TARGET}", end="\r")

    if real_buffer and real_saved < REAL_TARGET:
        real_saved = flush_buffer(real_buffer, REAL_DIR, real_saved)
    if fake_buffer and fake_saved < FAKE_TARGET:
        fake_saved = flush_buffer(fake_buffer, FAKE_DIR, fake_saved)

    print(f"\n\n🎉 Download complete!")
    print(f"   Real photos saved: {real_saved}")
    print(f"   AI photos saved:   {fake_saved}")


def setup_vault():
    real_images = sorted(REAL_DIR.glob(f"*.{IMAGE_FORMAT}"))
    fake_images = sorted(FAKE_DIR.glob(f"*.{IMAGE_FORMAT}"))

    if len(real_images) < 15 or len(fake_images) < 15:
        return

    moved_real = 0
    moved_fake = 0

    for img_path in real_images[-10:]:
        prefix = "e_" if moved_real < 8 else "h_"
        dest = VAULT_REAL / f"{prefix}{img_path.name}"
        img_path.rename(dest)
        moved_real += 1

    for img_path in fake_images[-10:]:
        prefix = "e_" if moved_fake < 5 else "h_"
        dest = VAULT_FAKE / f"{prefix}{img_path.name}"
        img_path.rename(dest)
        moved_fake += 1

    print(f"🔒 Vault updated with {moved_real} real + {moved_fake} AI images.\n")


if __name__ == "__main__":
    download()
    setup_vault()
    print("✨ Dataset ready! Start the app with: npm run dev")

