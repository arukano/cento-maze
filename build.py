# Builds dist/index.html for publishing: the Artifact host adds its own doctype/head/body skeleton.
import re, pathlib, shutil
root = pathlib.Path(__file__).parent
src = (root / "public/index.html").read_text()
head = re.search(r"<head>(.*?)</head>", src, re.S).group(1)
head = re.sub(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*', "", head)
body = re.search(r"<body>(.*?)</body>", src, re.S).group(1)
out = root / "dist"; out.mkdir(exist_ok=True)
(out / "index.html").write_text(head.strip() + "\n" + body.strip() + "\n")
shutil.copy(root / "public/poems.json", out / "poems.json")
print("built", (out / "index.html").stat().st_size, "bytes")
