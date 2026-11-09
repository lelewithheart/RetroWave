"""Build the CrazyGames upload bundle.

    python tools/build_crazygames.py          # Basic Launch: no ads
    python tools/build_crazygames.py --ads    # Full Launch: ads through the SDK

Writes dist/crazygames/ (the game folder) and dist/roguewave-crazygames.zip
(upload this one in the CrazyGames Developer Portal).

The bundle is the same game as the itch build with three differences:
  * index.html sets window.RW_PLATFORM = "crazygames". That switches off the
    Supporter Cache, because CrazyGames allows no purchases or links outside
    the platform.
  * The changelog has no lines about other platforms or the Supporter Cache.
  * env.txt carries the ad switch. Ads stay off for a Basic Launch: CrazyGames
    disables them there and rejects games with reward buttons that do nothing.
"""
import argparse
import re
import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "crazygames"
ZIP = ROOT / "dist" / "roguewave-crazygames.zip"

COPY_AS_IS = ["game.js", "config.js", "styles.css", "skinshop.txt"]
CACHE_URL_LINE = 'const CACHE_URL = "https://kelvik.at/roguewave";'
PLATFORM_TAG = '<script>window.RW_PLATFORM = "crazygames";</script>'
# Changelog lines that mention other platforms or things this build does not have.
CHANGELOG_DROP = re.compile(r"supporter cache|itch|kelvik", re.IGNORECASE)
# Nothing in the bundle may point outside it, except the CrazyGames SDK itself.
ALLOWED_URL = "https://sdk.crazygames.com/"


def build(ads: bool) -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    for name in COPY_AS_IS:
        shutil.copyfile(ROOT / name, OUT / name)
    shutil.copytree(ROOT / "assets", OUT / "assets", ignore=shutil.ignore_patterns(".*"))

    # The shop link is unreachable in this build; take the address out as well.
    fx = (ROOT / "fx.js").read_text(encoding="utf-8")
    if CACHE_URL_LINE not in fx:
        sys.exit("fx.js: could not find the CACHE_URL line")
    (OUT / "fx.js").write_text(fx.replace(CACHE_URL_LINE, 'const CACHE_URL = "";'),
                               encoding="utf-8", newline="\n")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    anchor = '<script src="changelogs.txt"></script>'
    if anchor not in html:
        sys.exit("index.html: could not find the changelog script tag")
    html = html.replace(anchor, PLATFORM_TAG + "\n" + anchor)
    (OUT / "index.html").write_text(html, encoding="utf-8", newline="\n")

    lines = (ROOT / "changelogs.txt").read_text(encoding="utf-8").splitlines()
    kept = [line for line in lines if not CHANGELOG_DROP.search(line)]
    (OUT / "changelogs.txt").write_text("\n".join(kept) + "\n", encoding="utf-8", newline="\n")

    (OUT / "env.txt").write_text(
        "# CrazyGames build. Ads run through the CrazyGames SDK only.\n"
        f"MONETIZATION={'true' if ads else 'false'}\n",
        encoding="utf-8", newline="\n",
    )

    check()

    if ZIP.exists():
        ZIP.unlink()
    files = sorted(p for p in OUT.rglob("*") if p.is_file())
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for p in files:
            # Forward slashes always: backslash entry names break on Linux hosts.
            z.write(p, p.relative_to(OUT).as_posix())

    total = sum(p.stat().st_size for p in files)
    print(f"ads: {'on' if ads else 'off'}")
    print(f"files: {len(files)}  size: {total / 1024:.0f} KB  (limits: 1500 files, 50 MB)")
    print(f"zip: {ZIP}")


def check() -> None:
    """Fail the build if something CrazyGames rejects slipped into the bundle."""
    problems = []
    changelog = (OUT / "changelogs.txt").read_text(encoding="utf-8")
    if CHANGELOG_DROP.search(changelog):
        problems.append("changelogs.txt still mentions another platform or the Supporter Cache")
    if PLATFORM_TAG not in (OUT / "index.html").read_text(encoding="utf-8"):
        problems.append("index.html has no platform flag")
    for name in ["index.html", "fx.js", "styles.css", "config.js", "skinshop.txt", "env.txt"]:
        text = (OUT / name).read_text(encoding="utf-8")
        for url in re.findall(r"https?://[^\s\"'`)<>]+", text):
            if not url.startswith(ALLOWED_URL):
                problems.append(f"{name}: external URL {url}")
        if re.search(r"""(?:src|href)\s*=\s*["']/""", text):
            problems.append(f"{name}: absolute path, CrazyGames needs relative paths")
    if problems:
        sys.exit("build check failed:\n  " + "\n  ".join(problems))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--ads", action="store_true", help="turn SDK ads on (Full Launch only)")
    build(parser.parse_args().ads)
