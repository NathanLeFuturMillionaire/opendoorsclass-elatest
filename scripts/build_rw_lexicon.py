#!/usr/bin/env python3
"""Build the autonomous Reading Workshop lexical shards from pinned open data."""

import argparse
import gzip
import hashlib
import html
import json
import re
import struct
import tempfile
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_ZIP_SHA256 = "6c610d35d1b16b71787d6d04586eed9fc5c0c682d6e68ea981f1dbb44f349371"
DASHES = re.compile(r"[\u2011\u2012\u2013\u2014\u2015]")
POS = {
    "n": "noun",
    "v": "verb",
    "a": "adjective",
    "adj": "adjective",
    "s": "adjective",
    "r": "adverb",
    "adv": "adverb",
    "prep": "preposition",
    "phr": "phrase",
    "pron": "pronoun",
    "conj": "conjunction",
    "interj": "interjection",
}
ARPABET = {
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ",
    "EH": "ɛ", "ER": "ɝ", "EY": "eɪ", "IH": "ɪ", "IY": "iː", "OW": "oʊ",
    "OY": "ɔɪ", "UH": "ʊ", "UW": "uː", "B": "b", "CH": "tʃ", "D": "d",
    "DH": "ð", "F": "f", "G": "ɡ", "HH": "h", "JH": "dʒ", "K": "k",
    "L": "l", "M": "m", "N": "n", "NG": "ŋ", "P": "p", "R": "r",
    "S": "s", "SH": "ʃ", "T": "t", "TH": "θ", "V": "v", "W": "w",
    "Y": "j", "Z": "z", "ZH": "ʒ",
}


def clean(value: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", "", value or ""))
    return DASHES.sub(", ", text).replace(" ,", ",").strip()


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", clean(value).lower().replace("’", "'")).strip()


def shard_key(value: str) -> str:
    letters = re.findall(r"[a-z]", value)
    return "".join(letters[:2]) if letters else "other"


def load_cmu(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith(";;;"):
            continue
        parts = line.split()
        word = norm(re.sub(r"\(\d+\)$", "", parts[0]))
        phones: list[str] = []
        for token in parts[1:]:
            key = re.sub(r"\d+$", "", token)
            stress = token[-1:] if token[-1:].isdigit() else ""
            value = ARPABET.get(key)
            if not value:
                phones = []
                break
            if key == "AH" and stress == "0":
                value = "ə"
            if key == "ER" and stress == "0":
                value = "ɚ"
            phones.append(value)
        if phones and word not in result:
            result[word] = "".join(phones)
    return result


def parse_entry(raw: str) -> list[dict]:
    senses: list[dict] = []
    for div in re.findall(r"<div>(.*?)</div>", raw, re.S):
        pos_match = re.match(r"\s*<i>(.*?)</i>", div, re.S)
        pos = POS.get(clean(pos_match.group(1)).rstrip(".").lower(), "") if pos_match else ""
        chunks = re.split(r'<span style="color:#666666">\d+\.</span>', div)
        for chunk in chunks[1:] if len(chunks) > 1 else chunks:
            bold = re.search(r"<b>(.*?)</b>", chunk, re.S)
            if not bold:
                continue
            translations = [clean(item) for item in clean(bold.group(1)).split(",") if clean(item)]
            if not translations:
                continue
            definition = re.search(r'<span style="color:#666666">&mdash;\s*(.*?)</span>', chunk, re.S)
            examples = [clean(item) for item in re.findall(r'<i style="color:#666666">(.*?)</i>', chunk, re.S)]
            sense: dict = {"p": pos, "t": translations[:10]}
            if definition and clean(definition.group(1)):
                sense["d"] = clean(definition.group(1))
            if examples:
                sense["e"] = examples[:2]
            senses.append(sense)
    return senses


def add_sense(entries: dict[str, dict], word: str, pos: str, translations: list[str], definition: str = "", example: str = "") -> None:
    if not word or not translations:
        return
    entry = entries.setdefault(word, {"h": word, "f": "", "s": []})
    if all(not set(translations).intersection(sense["t"]) for sense in entry["s"]):
        sense: dict = {"p": pos, "t": translations}
        if definition:
            sense["d"] = definition
        if example:
            sense["e"] = [example]
        entry["s"].insert(0, sense)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=Path("/tmp/rw-lexicon"))
    parser.add_argument("--output-dir", type=Path, default=ROOT / "public" / "rw-lexicon")
    parser.add_argument("--published-json", type=Path)
    args = parser.parse_args()

    archive = args.source_dir / "en-fr.zip"
    cmu_path = args.source_dir / "cmudict.dict"
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != EXPECTED_ZIP_SHA256:
        raise SystemExit(f"Unexpected en-fr.zip SHA-256: {digest}. Review the new source before rebuilding.")
    cmu = load_cmu(cmu_path)

    def ipa(word: str) -> str:
        parts = norm(word).split()
        return " ".join(cmu[part] for part in parts) if all(part in cmu for part in parts) else ""

    with tempfile.TemporaryDirectory(prefix="rw-lexicon-") as temporary:
        with ZipFile(archive) as zipped:
            zipped.extractall(temporary)
        base = Path(temporary) / "en-fr"
        raw_dict = gzip.decompress((base / "en-fr.dict.dz").read_bytes())
        index_data = (base / "en-fr.idx").read_bytes()
        entries: dict[str, dict] = {}
        index_words: list[str] = []
        cursor = 0
        while cursor < len(index_data):
            end = index_data.index(0, cursor)
            original = index_data[cursor:end].decode("utf-8")
            offset, size = struct.unpack_from(">II", index_data, end + 1)
            cursor = end + 9
            word = norm(original)
            index_words.append(word)
            senses = parse_entry(raw_dict[offset:offset + size].decode("utf-8"))
            if senses:
                entries[word] = {"h": word, "f": ipa(word), "s": senses}

        aliases: dict[str, str] = {}
        synonyms = (base / "en-fr.syn").read_bytes()
        cursor = 0
        while cursor < len(synonyms):
            end = synonyms.index(0, cursor)
            original = synonyms[cursor:end].decode("utf-8")
            index = struct.unpack_from(">I", synonyms, end + 1)[0]
            cursor = end + 5
            form = norm(original)
            target = index_words[index] if index < len(index_words) else ""
            if form and target and form != target and form not in entries:
                aliases[form] = target

    manual = json.loads((ROOT / "lexicon" / "manual-supplement.json").read_text(encoding="utf-8"))
    for original, item in manual.items():
        word = norm(original)
        add_sense(entries, word, item.get("pos", ""), [clean(value) for value in item["translations"]])

    if args.published_json:
        payload = json.loads(args.published_json.read_text(encoding="utf-8"))
        rows = payload.get("rows", payload) if isinstance(payload, dict) else payload
        for row in rows:
            vocabulary = row.get("vocabulary") or []
            if isinstance(vocabulary, str):
                vocabulary = json.loads(vocabulary)
            for item in vocabulary:
                if not isinstance(item, dict):
                    continue
                word = norm(str(item.get("word") or ""))
                translation = clean(str(item.get("translation_fr") or ""))
                if not word or not translation or not re.fullmatch(r"[a-z]+(?:[ '\-][a-z]+)*", word):
                    continue
                add_sense(
                    entries,
                    word,
                    "",
                    [translation],
                    clean(str(item.get("definition") or "")),
                    clean(str(item.get("example") or "")),
                )

    for word, entry in entries.items():
        if not entry["f"]:
            entry["f"] = ipa(word)

    shards: dict[str, dict] = {}

    def shard(word: str) -> dict:
        return shards.setdefault(shard_key(word), {"v": 1, "e": {}, "a": {}})

    for word, entry in entries.items():
        shard(word)["e"][word] = entry
    for form, target in aliases.items():
        shard(form)["a"][form] = target

    args.output_dir.mkdir(parents=True, exist_ok=True)
    for name, data in shards.items():
        (args.output_dir / f"{name}.json").write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    manifest = {
        "version": 1,
        "source_date": "2026-09-11",
        "entries": len(entries),
        "aliases": len(aliases),
        "shards": {key: len(value["e"]) for key, value in sorted(shards.items())},
        "bytes": sum((args.output_dir / f"{key}.json").stat().st_size for key in shards),
        "zip_sha256": digest,
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"entries": len(entries), "aliases": len(aliases), "shards": len(shards), "bytes": manifest["bytes"]}))


if __name__ == "__main__":
    main()
