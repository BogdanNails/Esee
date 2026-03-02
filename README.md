# Esee AI Coach

Aplicatie web simpla pentru a incarca eseuri PDF la romana si a primi explicatii de la un asistent AI.

## Rulare locala

```bash
python3 -m http.server 8000
```

Deschide apoi `http://localhost:8000`.

## Functionalitati

- incarcare PDF si extragere text in browser (pdf.js)
- sumar automat local al eseului
- chat AI pe baza continutului PDF-ului (prin OpenAI API key)
- carduri de invatare generate automat

## Configurare AI

1. Introdu cheia OpenAI in campul dedicat (ramane doar in sesiunea browserului)
2. Incarca PDF-ul
3. Pune intrebari despre eseu in chat

Daca nu introduci cheia API, aplicatia ofera doar functionalitatile locale (rezumat + carduri).
