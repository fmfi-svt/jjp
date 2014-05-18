
JJP
---

Quick start:

Install Python 2 (with virtualenv and pip). Then run:

    virtualenv venv
    venv/bin/pip install -r requirements.txt
    git init --bare repo
    venv/bin/python console.py initschema
    venv/bin/python console.py serve --debug
