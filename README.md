# Wine Tracker 🍷

Um aplicativo para rastrear todos os vinhos que você já provou. Tire uma foto do rótulo e o app dirá se você já tomou esse vinho!

## Características

- 📷 Fotografe ou escolha imagens de rótulos de vinho
- 🤖 Análise automática com IA (Claude Vision)
- ✓ Detecção se você já provou o vinho
- 📜 Histórico completo de vinhos catalogados
- 🔍 Busca por nome, região ou variedade de uva
- 💾 Dados salvos localmente no seu navegador

## Tecnologias

- Next.js 14
- React 18
- Claude API (Vision)

## Como clonar e testar localmente

1. Clone o repositório:
```bash
git clone <seu-repositorio>
cd wine-tracker
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Como fazer deploy no Vercel

### Opção 1: Via GitHub (Recomendado)

1. Faça push do código para um repositório GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/wine-tracker.git
git push -u origin main
```

2. Vá para [vercel.com](https://vercel.com)

3. Clique em "New Project"

4. Importe seu repositório GitHub

5. Vercel detectará automaticamente que é um projeto Next.js

6. Clique em "Deploy"

### Opção 2: Via CLI do Vercel

1. Instale o Vercel CLI:
```bash
npm i -g vercel
```

2. Na pasta do projeto, execute:
```bash
vercel
```

3. Siga as instruções para fazer login e fazer o deploy

## Variáveis de Ambiente

Por padrão, o app usa a chave da API do Claude que você fornece diretamente no navegador. Para usar em produção com segurança:

1. Adicione uma variável de ambiente `NEXT_PUBLIC_ANTHROPIC_API_KEY` no Vercel:
   - Vá para Settings > Environment Variables
   - Adicione sua chave da API do Anthropic

2. Atualize o código para usar a variável de ambiente em vez da chave hardcoded

## Usar a API com sua chave

O aplicativo chamará a API do Claude diretamente do navegador. Você pode:

1. Usar sua chave de API pessoal (cuidado com segurança)
2. Criar um backend que faça a chamada da API (seguro)
3. Usar uma variável de ambiente do Vercel

## License

MIT
