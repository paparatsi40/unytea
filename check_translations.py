import json

with open('locales/en.json', 'r') as f:
    data = json.load(f)

landing = data.get('landing', {})
print('Landing sections:')
for key in landing.keys():
    print(f"  {key}")
