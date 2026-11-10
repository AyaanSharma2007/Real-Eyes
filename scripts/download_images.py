"""
RealEyes — HuggingFace Dataset Downloader
==========================================
Downloads a balanced subset of real and AI-generated images from the
Parveshiiii/AI-vs-Real dataset using the HuggingFace streaming API.

Dataset specs:
  - Feature name: 'binary_label' (and 'image')
  - binary_label == 1 → Real (human-captured)
  - binary_label == 0 → AI-generated (Synthetic)

Usage:
    pip install datasets Pillow huggingface_hub
    python scripts/download_images.py
"""

import os
import random
from pathlib import Path
from datasets import load_dataset
from PIL import Image

# ── Configuration ──────────────────────────────────────────────────────────
DATASET_ID    = "Parveshiiii/AI-vs-Real"
REAL_TARGET   = 300
FAKE_TARGET   = 300
BUFFER_SIZE   = 50          # shuffle buffer for diversity
IMAGE_FORMAT  = "jpg"
IMAGE_QUALITY = 90

# Resolve paths relative to project root
SCRIPT_DIR   = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
REAL_DIR     = PROJECT_ROOT / "data" / "real"
FAKE_DIR     = PROJECT_ROOT / "data" / "fake"
VAULT_REAL   = PROJECT_ROOT / "data" / ".vault" / "real"
VAULT_FAKE   = PROJECT_ROOT / "data" / ".vault" / "fake"

# ── Helpers ────────────────────────────────────────────────────────────────
def ensure_dirs():
    """Create output directories if they don't exist."""
    REAL_DIR.mkdir(parents=True, exist_ok=True)
    FAKE_DIR.mkdir(parents=True, exist_ok=True)
    VAULT_REAL.mkdir(parents=True, exist_ok=True)
    VAULT_FAKE.mkdir(parents=True, exist_ok=True)
    print(f"📁 Real Directory:  {REAL_DIR}")
    print(f"📁 Fake Directory:  {FAKE_DIR}")
    print(f"🔒 Vault Directory: {VAULT_REAL.parent}")


def save_image(img, dest_dir: Path, index: int, prefix: str = ""):
    """Save a PIL image to the destination directory."""
    filename = f"{prefix}{index:04d}.{IMAGE_FORMAT}"
    filepath = dest_dir / filename
    if isinstance(img, Image.Image):
        img = img.convert("RGB")
        img.save(filepath, format="JPEG", quality=IMAGE_QUALITY)
    else:
        raise ValueError(f"Unexpected image type: {type(img)}")
    return filepath


def flush_buffer(buffer: list, dest_dir: Path, counter: int) -> int:
    """Shuffle and save all images in the buffer. Returns new counter value."""
    random.shuffle(buffer)
    for img in buffer:
        save_image(img, dest_dir, counter)
        counter += 1
    buffer.clear()
    return counter


# ── Main Download Logic ───────────────────────────────────────────────────
def download():
    ensure_dirs()

    print(f"\n🔄 Streaming dataset from HuggingFace: {DATASET_ID}")
    print(f"   Target: {REAL_TARGET} real + {FAKE_TARGET} fake images\n")

    # Load as a streaming dataset — no full download required
    dataset = load_dataset(DATASET_ID, split="train", streaming=True)

    # Counters
    real_saved = 0
    fake_saved = 0

    # Buffers for diversity shuffle
    real_buffer = []
    fake_buffer = []

    total_scanned = 0

    for sample in dataset:
        # Hard stop: both categories full
        if real_saved >= REAL_TARGET and fake_saved >= FAKE_TARGET:
            print(f"\n✅ Hard stop reached! Scanned {total_scanned} samples total.")
            break

        total_scanned += 1

        # Extract label and image
        # Parveshiiii/AI-vs-Real schema:
        # binary_label == 1: Real
        # binary_label == 0: AI-generated (Fake)
        label = sample.get("binary_label", sample.get("label", sample.get("Label", None)))
        img   = sample.get("image", sample.get("Image", None))

        if label is None or img is None:
            continue

        # Real images (binary_label == 1)
        if label == 1 and real_saved < REAL_TARGET:
            real_buffer.append(img)
            if len(real_buffer) >= BUFFER_SIZE:
                real_saved = flush_buffer(real_buffer, REAL_DIR, real_saved)
                print(f"   [Streaming] Real: {real_saved}/{REAL_TARGET}  |  Fake: {fake_saved}/{FAKE_TARGET}", end="\r")

        # Fake images (binary_label == 0)
        elif label == 0 and fake_saved < FAKE_TARGET:
            fake_buffer.append(img)
            if len(fake_buffer) >= BUFFER_SIZE:
                fake_saved = flush_buffer(fake_buffer, FAKE_DIR, fake_saved)
                print(f"   [Streaming] Real: {real_saved}/{REAL_TARGET}  |  Fake: {fake_saved}/{FAKE_TARGET}", end="\r")

    # Flush any remaining items in buffer
    if real_buffer and real_saved < REAL_TARGET:
        real_saved = flush_buffer(real_buffer, REAL_DIR, real_saved)
    if fake_buffer and fake_saved < FAKE_TARGET:
        fake_saved = flush_buffer(fake_buffer, FAKE_DIR, fake_saved)

    print(f"\n\n🎉 Download complete!")
    print(f"   Real images saved: {real_saved}")
    print(f"   Fake images saved: {fake_saved}")
    print(f"   Total scanned:     {total_scanned}")


# ── Edge Cache Setup (for preloaded telemetry assets) ───────────────────
def setup_vault():
    """
    Populates the edge cache directory with 10 real and 10 fake images
    from the downloaded set for preloaded latency evaluation assets.
    """
    real_images = sorted(REAL_DIR.glob(f"*.{IMAGE_FORMAT}"))
    fake_images = sorted(FAKE_DIR.glob(f"*.{IMAGE_FORMAT}"))

    if len(real_images) < 15 or len(fake_images) < 15:
        print("⚠️  Not enough downloaded images to populate edge tier yet.")
        return

    # Pick 10 from real and 10 from fake to move into the edge tier
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

    print(f"\n⚡ Edge cache tier populated!")
    print(f"   Indexed {moved_real} real and {moved_fake} fake images into edge tier.\n")


if __name__ == "__main__":
    download()
    setup_vault()
    print("\n✨ Ready to play! Start the application:")
    print("   1. Backend:  cd server && npm run dev")
    print("   2. Frontend: cd client && npm run dev")
