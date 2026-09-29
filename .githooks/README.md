# Git hooks do projeto

A **revisão/varredura antes do push é a principal barreira de segurança** deste
repositório. O hook `pre-push` roda automaticamente antes de todo `git push` e
**bloqueia o envio** se encontrar prováveis segredos (chaves privadas, tokens AWS/
GitHub/Slack/OpenAI, JWTs, e atribuições de `password`/`secret`/`token`/`api_key`)
nas linhas adicionadas dos commits que estão sendo enviados.

## Ativação (uma vez por clone)

O caminho de hooks não é propagado automaticamente pelo Git. Cada pessoa que clona
o repositório deve rodar:

```bash
git config core.hooksPath .githooks
# em ambientes tipo Unix / Git Bash, garanta a permissão de execução:
chmod +x .githooks/pre-push
```

## Uso

- Push normal: o hook roda sozinho. Se estiver tudo limpo, o push segue.
- Se um segredo for detectado, o push é **bloqueado** e os trechos suspeitos são
  exibidos (mascarados). Remova o segredo do código e **rotacione-o** (considere-o
  comprometido); use variáveis de ambiente / secret manager.
- Falso positivo comprovado: `git push --no-verify` (use com consciência).

## Camadas complementares no servidor (GitHub)

Este hook é a barreira **local** e principal. Ele não substitui, mas complementa,
as proteções do lado do servidor que devem ser habilitadas no repositório:

- **Branch protection** em `main`: exigir Pull Request + revisão aprovada antes do
  merge, exigir que os checks passem e proibir push direto na branch.
- **Secret scanning** + **push protection**: varredura de segredos do GitHub.

Consulte o time/README principal para o passo a passo dessas configurações no painel
do GitHub (Settings → Branches e Settings → Code security).
