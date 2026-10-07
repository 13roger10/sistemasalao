# Relatório de correção — Auditoria E2E do Belezza (outubro de 2026)

**Auditoria:** 06/10/2026, sobre o commit `fb45763`. Foram 1.635 testes, com 38 bugs encontrados; a conclusão foi que o sistema não estava pronto para produção.
**Correções:** de 06/10 a 07/10/2026, no `main`.
**Último commit coberto:** `bd56929`.

Os 38 bugs estão corrigidos, testados e no `origin/main`. Antes de publicar, ainda há uma decisão sobre a tela de Estoque e alguns pontos a conferir (seção 4).

## 1. Situação dos testes

| | Antes da auditoria | Depois das correções |
|---|---|---|
| Testes unitários do backend | — | 408, nenhuma falha |
| Testes de integração novos | — | 9 arquivos, todos passando |
| TypeScript (`tsc --noEmit`) | 13 erros | 0 |
| Testes do frontend (Jest) | 44 falhando | 239 de 239 passando |

## 2. O que foi corrigido

### Críticos

| Bug | O que foi corrigido | Commit |
|---|---|---|
| #001 | As métricas por salão abriam para qualquer usuário. Agora exigem papel e o salão do usuário. | `1f65bf1` |
| #002 | Um cliente conseguia desconectar o Instagram de outro salão. Agora só o admin do próprio salão mexe nisso. | `f4fb16e` |
| #003 | A ficha de Coloração não tinha controle de papel nem separação entre salões. Agora é só da equipe e só com clientes do próprio salão. | `da99bf5` |
| #004 | O admin padrão (`admin@belezza.ai` / `Admin@123`) existia também em produção. Agora ele é bloqueado em produção. | `3230e94` |
| #005 | Um admin conseguia apagar posts de outro salão. Isso foi bloqueado. | `a5f16a0` |

### Altos

| Bug | O que foi corrigido | Commit |
|---|---|---|
| #006 | Auditoria e backup eram simulados e sem login. Agora usam dados reais e só o admin acessa. | `f4578b0` |
| #007 | O logout revoga a sessão, e o token de renovação passou a valer uma vez só. | `a3e50c8` |
| #008 | Feriados e datas especiais passaram a ser gravados, e a agenda os respeita. | `09dac0c` |
| #009 | A chave de segurança dos tokens não tem mais valor padrão. O Swagger e a rota de desenvolvimento ficam fechados. | `8a22be3` |
| #010 | Posts deixaram de dar erro 500. | `285505c` |
| #011 | Chaves de API deixaram de dar erro 500. | `45bf8a2` |
| #012 | Fidelidade, Avaliações e Coloração mostram dados reais. Promoções saiu do menu. | `a36b3db` |
| #013 | Tarefas, Metas e Estoque usam o salão de quem está logado. | `b6751d1` |
| #014 | A página pública de agendamento mostra o salão e os serviços reais. | `a74a6d8` |

### Médios

| Bug | O que foi corrigido | Commit |
|---|---|---|
| #015 | O cliente não consegue mais ter dois agendamentos no mesmo horário. | `2073ec1` |
| #016 | Trocar a senha encerra as sessões antigas. | `3dcd854` |
| #017 | E-mail com letras maiúsculas deixou de dar erro 500. | `3dcd854` |
| #018 | Observação longa do cliente deixou de dar erro 500 e mostra uma mensagem clara. | `3dcd854` |
| #019 | WhatsApp sem configuração deixou de dar erro 500 e mostra o motivo. | `3dcd854` |
| #020 | A busca da auditoria deixou de dar erro 500. | `f4578b0` |
| #021 | A comissão dos profissionais só aparece para o admin e para o próprio profissional. | `84a701e` |
| #022 | Estornar só uma parte de um pagamento dividido deixa a comissão proporcional ao que continua pago, em vez de cancelá-la inteira. | `84a701e` |
| #023 | Quem se cadastra sozinho só consegue entrar depois de confirmar o e-mail. | `84a701e` |
| #024 | Os erros de TypeScript e os testes do frontend foram corrigidos (ver nota abaixo). | `84a701e` |
| #025 | O perfil do cliente mostra números reais, e Tarefas mostra o erro em vez de tarefas inventadas. | `84a701e` |
| #026 | Os lembretes automáticos são configurados por salão, e o envio respeita essa configuração. | `7cb3d47` |
| #027 | O admin entra no Social Studio sem fazer um segundo login. | `7cb3d47` |
| #028 | As telas de configuração são só do admin, e o cliente não abre telas da equipe. | `7cb3d47` |
| #038 | O Extrato do funcionário passou a chamar a rota que existe. | `bd56929` |

Nota sobre o #024: corrigir os tipos revelou três bugs reais:
- os códigos de backup do 2FA não apareciam;
- a sugestão de tonalidade da Coloração sempre falhava;
- o histórico não mostrava o nome dos serviços.

### Baixos

| Bug | O que foi corrigido | Commit |
|---|---|---|
| #029 | Sem servidor de e-mail, o health continua UP. | `7cb3d47` |
| #030 | Acesso negado em Posts devolve 403, e não 400. | `7cb3d47` |
| #031 | Preço com mais de 2 casas decimais é recusado. | `bd56929` |
| #032 | CNPJ é validado pelos dígitos verificadores. | `bd56929` |
| #033 | Uma saída maior que o saldo do estoque é recusada, em vez de zerar o estoque. | `bd56929` |
| #034 | A lista de profissionais avisa quem está sem serviços e por isso não pode ser agendado. | `bd56929` |
| #035 | A nota média do salão abre sem login. | `bd56929` |
| #036 | No celular, os botões de ação das tabelas ficam sempre visíveis. | `bd56929` |
| #037 | Acabaram as linhas duplicadas na lista do Caixa. | `bd56929` |

## 3. Conferido com o sistema rodando

No ambiente local de teste, sem tocar em dados de produção:
- **Backend:** reconstruído no Docker. Ele responde na porta 8081, não na 8080.
- **Migrações:** as V56, V57 e V58 foram aplicadas no banco local.
- **#029:** o health responde UP.
- **#035:** a média de avaliações abre sem login (200), e a lista de avaliações continua pedindo login (401).
- **#028:** o cliente e o profissional são redirecionados ao tentar abrir telas de configuração.
- **#027:** a sessão do admin vale no Social Studio; a de um cliente não vale.

## 4. Decisões e pontos pendentes

1. **A tela de Estoque é inteira simulada.** Este é um achado novo, fora da lista da auditoria.
    - A `/salon/stock` não chama a API: mostra produtos fictícios, e o que o admin cadastra some ao recarregar a página.
    - O backend de estoque existe e funciona.
    - Há duas saídas: ligar a tela à API, um trabalho grande, ou tirá-la do menu por enquanto, como foi feito com Promoções.
2. **Clientes antigos sem e-mail confirmado (#023):** passam a só entrar depois de confirmar o e-mail ou de usar o "Esqueci minha senha". Confira se o envio de e-mail funciona em produção antes de publicar.
3. **CNPJs inválidos já gravados (#032):** salões, unidades ou fornecedores com CNPJ inválido no banco não conseguem salvar a edição até corrigir o número.
4. **Não conferido em navegador real:** no Social Studio (#027), a parte do frontend que reaproveita o login do salão e o logout que encerra as duas sessões. O bloqueio de rotas foi testado.
5. **Não há CI no repositório.** O `tsc` (`npm run typecheck`) e o Jest só rodam se alguém executar manualmente.
6. **Testes de integração antigos já quebrados:** `AuthFlowIT`, `AppointmentFlowIT` e `SocialStudioFlowIT` já falhavam antes destas correções. Eles usam fluxos que hoje são proibidos ou rotas que não existem mais.
