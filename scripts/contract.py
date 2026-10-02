"""Bounded validator for the closed schema subset used by this project.

Unsupported schema keywords fail closed; this is not a general JSON Schema engine.
"""
import json
import re
from datetime import datetime


def loads(text):
    def pairs(items):
        out = {}
        for key, value in items:
            if key in out:
                raise ValueError('duplicate JSON key')
            out[key] = value
        return out
    def reject(value):
        raise ValueError('non-finite JSON number')
    return json.loads(text, object_pairs_hook=pairs, parse_constant=reject)


def validate(value, schema):
    supported = {'$schema', 'title', 'description', 'type', 'additionalProperties',
                 'required', 'properties', 'items', 'maxItems', 'minItems', 'enum',
                 'const', 'pattern', 'maxLength', 'minLength', 'minimum', 'maximum', 'format'}
    if set(schema) - supported:
        raise ValueError('unsupported schema keyword')
    types = schema.get('type', [])
    types = [types] if isinstance(types, str) else types
    kind = ('null' if value is None else 'boolean' if type(value) is bool else
            'integer' if type(value) is int else 'string' if type(value) is str else
            'array' if type(value) is list else 'object' if type(value) is dict else 'invalid')
    if types and kind not in types:
        raise ValueError('invalid contract type')
    if 'const' in schema and (type(value) is not type(schema['const']) or value != schema['const']):
        raise ValueError('invalid constant')
    if 'enum' in schema and value not in schema['enum']:
        raise ValueError('unapproved enum value')
    if kind == 'object':
        props = schema.get('properties', {})
        if schema.get('additionalProperties') is not False:
            raise ValueError('object contract must be closed')
        if set(value) - set(props) or set(schema.get('required', [])) - set(value):
            raise ValueError('unknown or missing field')
        for key, item in value.items():
            validate(item, props[key])
    elif kind == 'array':
        if not schema.get('minItems', 0) <= len(value) <= schema.get('maxItems', 1000):
            raise ValueError('array bounds')
        for item in value:
            validate(item, schema['items'])
    elif kind == 'string':
        if not schema.get('minLength', 0) <= len(value) <= schema.get('maxLength', 1000):
            raise ValueError('string bounds')
        if 'pattern' in schema and not re.fullmatch(schema['pattern'], value):
            raise ValueError('string pattern')
        if schema.get('format') == 'date-time':
            try:
                if not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)', value):
                    raise ValueError('timestamp syntax')
                if datetime.fromisoformat(value.replace('Z', '+00:00')).tzinfo is None:
                    raise ValueError('timestamp zone')
            except ValueError:
                raise ValueError('invalid timestamp') from None
        elif 'format' in schema:
            raise ValueError('unsupported format')
    elif kind == 'integer':
        if value < schema.get('minimum', value) or value > schema.get('maximum', value):
            raise ValueError('number bounds')
