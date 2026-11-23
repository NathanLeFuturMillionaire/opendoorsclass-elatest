# Reading Workshop local lexicon

The clicked-word dictionary is fully local at runtime. It uses static JSON shards served from `public/rw-lexicon`, a rule-based grammatical analyzer, and browser caching. It never calls an AI model, an AI gateway, or a paid translation service.

## Sources and commercial use

- English and French senses: `en-fr` by Daniel Gregorini, generated from WOLF through Open Multilingual Wordnet 1.4 and Princeton WordNet 3.0. The compilation is distributed under CeCILL-C. WOLF retains its CeCILL-C terms. WordNet 3.0 explicitly permits commercial applications with its copyright notice.
- Inflected forms: the same `en-fr` StarDict compilation.
- Pronunciation: CMU Pronouncing Dictionary. Carnegie Mellon University permits unrestricted research and commercial use with acknowledgement and retention of its license.
- Common function words and selected current lesson terms: `manual-supplement.json`, reviewed editorial data from OpenDoorsClass.
- Grammatical analysis and lemmatization: `compromise`, MIT license. It is rule-based and runs locally in the browser.

The notices are available to users at `/licenses/rw-lexicon.txt`. The CeCILL-C and WordNet notices remain with the lexical data. The generated lexical data must retain those notices.

## Pinned source

The source archive is the `en-fr.zip` release from `DanielGregorini/koreader-dicts`, dated 2026-09-11 in its StarDict metadata.

Expected SHA-256:

```text
6c610d35d1b16b71787d6d04586eed9fc5c0c682d6e68ea981f1dbb44f349371
```

## Rebuild

Download the source files into a temporary directory, then run the converter. This is a development operation only. The application never performs these downloads at runtime.

```bash
curl -fL https://github.com/DanielGregorini/koreader-dicts/releases/latest/download/en-fr.zip -o /tmp/rw-lexicon/en-fr.zip
curl -fL https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict -o /tmp/rw-lexicon/cmudict.dict
python3 scripts/build_rw_lexicon.py --source-dir /tmp/rw-lexicon --output-dir public/rw-lexicon
```

An optional `--published-json` file can add the already reviewed vocabulary of published lessons. It is not required and is not shipped as private data.

## Context selection

The lookup first recognizes the longest available expression containing the clicked word. It then resolves inflected forms and lemmatizes verbs and nouns. Senses are filtered by grammatical category and ranked using the sentence, English definitions, examples, and explicit lexical context rules. If several senses remain equally plausible, the interface shows them together instead of inventing one certain translation.

Unknown words produce an explicit unavailable message. Proper nouns are kept without translation. There is deliberately no AI fallback.
