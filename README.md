
JJP
---

Quick start:

Install node.js (with npm) and Python 2 (with virtualenv and pip). Then run:

    make
    virtualenv venv
    venv/bin/pip install -r requirements.txt
    git init --bare repo
    venv/bin/python console.py initschema
    venv/bin/python console.py serve --debug
