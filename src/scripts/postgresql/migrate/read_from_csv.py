#!/usr/bin/env python

import os, sys

db = os.environ.get('SMC_DB', 'migrate')

def process(x):
    base, ext = os.path.splitext(x)
    name = os.path.split(base)[1]
    if name.endswith('-time'):
        name = name[:-5]
    s = """time echo "drop table %s_json; create table %s_json (a JSONB); copy %s_json from '%s' with (format csv, DELIMITER e'\\1', QUOTE e'\\2');" | psql %s """%(name, name, name, os.path.abspath(x), db)
    print(s)
    if os.system(s):
        raise RuntimeError("error exporting from rethinkdb - %s"%x)


if __name__ == "__main__":
    for file in sys.argv[1:]:
        process(file)