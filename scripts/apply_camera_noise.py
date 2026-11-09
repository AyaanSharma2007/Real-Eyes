#!/usr/bin/env python3
"""
RealEyes — Non-Destructive Image Degrader & Realism Enhancer

Applies photographic imperfections without overwriting original files:
  1. Creates an automatic backup of originals (e.g. data/backup_originals/ or _backup folders).
  2. Or saves processed images to a dedicated output folder (e.g. data/processed/ or custom).
  3. Includes a --restore option to instantly revert any folder back to pristine originals.

Usage examples:
  # 1. Non-destructive processing in-place (automatically backs up originals first):
  python3 scripts/apply_camera_noise.py --target fake

  # 2. Process to a separate output directory (leaves data/ completely untouched):
  python3 scripts/apply_camera_noise.py --target fake --output-dir data/enhanced_fake

  # 3. Restore all original files from backup at any time:
  python3 scripts/apply_camera_noise.py --restore --target fake
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

def degrade_image(src_path: Path, dest_path: Path, max_size=768, noise_level=6.5, jpeg_quality=78):
    try:
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            orig_w, orig_h = img.size

            # 1. Downscale resolution if larger than max_size
            if max(orig_w, orig_h) > max_size:
                scale = max_size / float(max(orig_w, orig_h))
                new_w = max(1, int(orig_w * scale))
                new_h = max(1, int(orig_h * scale))
                img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

            # 2. Add camera sensor grain (Gaussian noise)
            if noise_level > 0:
                arr = np.array(img, dtype=np.float32)
                noise = np.random.normal(0, noise_level, arr.shape)
                noisy_arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
                img = Image.fromarray(noisy_arr)

            # Ensure parent destination directory exists
            dest_path.parent.mkdir(parents=True, exist_ok=True)

            # 3. Save to destination path with JPEG compression artifacts
            img.save(dest_path, format="JPEG", quality=jpeg_quality, optimize=True)
            return True
    except Exception as e:
        print(f"Failed to process {src_path.name}: {e}")
        return False

def backup_directory(source_dir: Path, backup_dir: Path):
    """Safely backs up original files before any modifications."""
    if not source_dir.exists():
        return
    backup_dir.mkdir(parents=True, exist_ok=True)
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [f for f in source_dir.iterdir() if f.is_file() and f.suffix.lower() in valid_exts]
    
    backed_up = 0
    for f in files:
        target = backup_dir / f.name
        # Only copy if not already backed up to preserve true pristine originals
        if not target.exists():
            shutil.copy2(f, target)
            backed_up += 1
    if backed_up > 0:
        print(f"  📁 Safely backed up {backed_up} original files into: {backup_dir.relative_to(backup_dir.parent.parent)}")

def restore_directory(source_dir: Path, backup_dir: Path):
    """Restores pristine originals from the backup directory."""
    if not backup_dir.exists():
        print(f"  ❌ No backup found at {backup_dir}. Cannot restore.")
        return 0
    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    backup_files = [f for f in backup_dir.iterdir() if f.is_file() and f.suffix.lower() in valid_exts]
    restored = 0
    for f in backup_files:
        shutil.copy2(f, source_dir / f.name)
        restored += 1
    print(f"  🔄 Successfully restored {restored} original images into {source_dir.name}/")
    return restored

def process_directory(dir_path: Path, output_dir: Path = None, backup_root: Path = None,
                      max_size=768, noise_level=6.5, quality=78):
    if not dir_path.exists():
        print(f"Directory {dir_path} does not exist. Skipping.")
        return 0

    valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
    files = [f for f in dir_path.iterdir() if f.is_file() and f.suffix.lower() in valid_exts]
    total = len(files)
    if total == 0:
        print(f"No images in {dir_path}")
        return 0

    # If writing in-place, back up originals first
    if output_dir is None:
        backup_dir = backup_root / dir_path.name
        backup_directory(dir_path, backup_dir)
        dest_folder = dir_path
        print(f"\nProcessing {total} images in '{dir_path.name}' (Originals safely preserved in {backup_dir.name})...")
    else:
        dest_folder = output_dir
        dest_folder.mkdir(parents=True, exist_ok=True)
        print(f"\nProcessing {total} images from '{dir_path.name}' -> saving copies into '{output_dir.name}'...")

    count = 0
    for idx, f in enumerate(files, 1):
        target_path = dest_folder / f.name
        if degrade_image(f, target_path, max_size, noise_level, quality):
            count += 1
        if idx % 50 == 0 or idx == total:
            print(f"  [{idx}/{total}] processed...")
    return count

def main():
    parser = argparse.ArgumentParser(description="Add camera noise and decrease resolution without losing originals.")
    parser.add_argument("--target", choices=["fake", "all", "vault", "real"], default="fake",
                        help="Which image sets to process: 'fake' (default), 'all', 'vault', or 'real'")
    parser.add_argument("--output-dir", type=str, default=None,
                        help="Optional separate output directory. If omitted, images in data/ are updated but originals are backed up first.")
    parser.add_argument("--restore", action="store_true",
                        help="Restore pristine originals from backup directory and exit.")
    parser.add_argument("--max-size", type=int, default=768,
                        help="Maximum width/height dimension (default: 768px)")
    parser.add_argument("--noise", type=float, default=6.5,
                        help="Noise intensity (default: 6.5, recommended 4-8)")
    parser.add_argument("--quality", type=int, default=78,
                        help="JPEG compression quality (default: 78, recommended 72-82)")
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"
    backup_root = data_dir / ".originals_backup"

    target_pairs = []
    if args.target == "fake":
        target_pairs.append((data_dir / "fake", backup_root / "fake"))
    elif args.target == "real":
        target_pairs.append((data_dir / "real", backup_root / "real"))
    elif args.target == "vault":
        target_pairs.append((data_dir / ".vault" / "fake", backup_root / "vault_fake"))
        target_pairs.append((data_dir / ".vault" / "real", backup_root / "vault_real"))
    elif args.target == "all":
        target_pairs.append((data_dir / "fake", backup_root / "fake"))
        target_pairs.append((data_dir / "real", backup_root / "real"))
        if (data_dir / ".vault").exists():
            target_pairs.append((data_dir / ".vault" / "fake", backup_root / "vault_fake"))
            target_pairs.append((data_dir / ".vault" / "real", backup_root / "vault_real"))

    # Restore mode
    if args.restore:
        print("\n🔄 Restoring pristine originals from backup...")
        total_restored = 0
        for src, bkp in target_pairs:
            total_restored += restore_directory(src, bkp)
        print(f"\n✅ Restored {total_restored} original images across targets.\n")
        return

    # Processing mode
    total_done = 0
    out_dir_path = Path(args.output_dir) if args.output_dir else None

    for src, bkp in target_pairs:
        total_done += process_directory(
            dir_path=src,
            output_dir=out_dir_path,
            backup_root=backup_root,
            max_size=args.max_size,
            noise_level=args.noise,
            quality=args.quality
        )

    print(f"\n✨ Done! Processed {total_done} images.")
    if out_dir_path:
        print(f"   Outputs saved to: {out_dir_path}")
        print(f"   Originals at: {data_dir} (100% untouched)")
    else:
        print(f"   Originals safely preserved in: {backup_root}")
        print(f"   To restore originals anytime, simply run:")
        print(f"     python3 scripts/apply_camera_noise.py --restore --target {args.target}")

if __name__ == "__main__":
    main()
