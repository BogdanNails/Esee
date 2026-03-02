# MentorEseu AI

Site pentru învățarea eseurilor la română din PDF, cu:
- extragere text din PDF
- rezumat rapid
- plan de învățare pas cu pas
- mock tests automate
- chat AI (dacă introduci cheia OpenAI în interfață)

## Rulare locală

```bash
python3 -m http.server 8000
```

Apoi deschide `http://localhost:8000`.

## De ce nu e cheia API în cod?

Nu este sigur să pui cheia OpenAI direct în cod (poate fi furată imediat). Aplicația cere cheia în interfață, local, la runtime.

## Dacă AI-ul spune că nu poate răspunde

1. verifică dacă cheia API este corectă
2. verifică dacă ai credit/billing activ pe cont
3. încearcă din nou întrebarea după ce ai extras textul din PDF
4. verifică consola browserului pentru erori HTTP
