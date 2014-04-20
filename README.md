
JJP
---

Quick start (assuming virtualenv and pip are installed):

    virtualenv venv
    source venv/bin/activate
    pip install -r requirements.txt
    git init --bare repo
    ./console.py initschema
    ./console.py serve --debug
