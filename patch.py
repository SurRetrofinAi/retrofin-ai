lines = open('api_full.py', 'r', encoding='utf-8').readlines()
lines[588] = '# ' + lines[588]
open('api_full.py', 'w', encoding='utf-8').writelines(lines)
print('Patched line 588')
