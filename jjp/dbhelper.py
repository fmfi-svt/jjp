
from sqlalchemy.sql import and_


def _where(table, criteria):
    return and_(*(getattr(table.c, key) == criteria[key] for key in criteria))


class DbHelper(object):
    '''Provides convenience methods for accessing the database.

    This project doesn't use SqlAlchemy ORM, but the core SA API is a bit
    too verbose. This class makes it a bit easier to use.'''

    def __init__(self, conn):
        self.conn = conn

    def execute(self, object, *multiparams, **params):
        return self.conn.execute(object, *multiparams, **params)

    def select(self, table, **criteria):
        return self.execute(table.select(_where(table, criteria)))

    def insert(self, table, **values):
        result = self.execute(table.insert(values))
        key = result.inserted_primary_key
        return key[0] if len(key) == 1 else key

    def update(self, table, criteria, **values):
        return self.execute(table.update(_where(table, criteria), values))

    def delete(self, table, **criteria):
        return self.execute(table.delete(_where(table, criteria)))

    def get_one(self, table, **criteria):
        rows = list(self.select(table, **criteria))
        if len(rows) == 1:
            return rows[0]
        elif len(rows) == 0:
            raise KeyError("No result found")
        else:
            raise LookupError("Multiple results found")
