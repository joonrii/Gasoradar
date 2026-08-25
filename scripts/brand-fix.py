from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
s=s.replace('Gaso<span>radar</span>', 'Gasolina<span>Go</span>')
s=s.replace('Gasoradar', 'GasolinaGo').replace('gasoradar', 'gasolinago')
p.write_text(s, encoding='utf-8')
