# Rules: Git

Escopo: commits, branches, PRs, todo o repositório.

## Conventional Commits

Format: `<type>(<scope>?): <subject>`

**Types**:

- `feat`: nova feature pro usuário
- `fix`: bug fix
- `chore`: tarefa interna (deps, config) sem efeito no usuário
- `docs`: documentação
- `test`: adicionar ou ajustar teste
- `refactor`: mudança de código sem mudar comportamento
- `perf`: otimização de performance
- `style`: formatação, lint, espaços (sem mudança de lógica)
- `build`: mudança em build system, deps
- `ci`: mudança em CI config

**Scope** (opcional): pacote ou módulo afetado.

Exemplos:

```
feat(api): add reservation expiration job
fix(web): correct points display when balance is zero
chore: bump pnpm to 9.15.0
docs: update INDEX with new garagem screen
refactor(db): extract balance helpers to lib
test(api): cover webhook MP idempotency
```

**Subject**:

- Inglês, lowercase, sem ponto final
- Imperativo presente ("add", não "added" ou "adds")
- Máx 72 chars

## Body de commit (opcional mas valorizado)

Quando o subject não basta, adiciona body separado por linha em branco:

```
feat(api): add reservation expiration job

Reservations stay pending for 24h waiting TPC confirmation.
After 24h, job runs and moves points back from reserved to available.

Job uses BullMQ with delayed schedule. Retries 3 times with exp backoff.
```

## Branches

- `main`: protegida, deploy automático.
- `feat/<descricao-curta>`: nova feature. Ex: `feat/comprar-pontos`.
- `fix/<descricao-curta>`: bugfix. Ex: `fix/saldo-negativo-webhook`.
- `chore/<descricao-curta>`: refactor, deps, etc.
- `docs/<descricao-curta>`: só docs.

Lowercase, kebab-case, descrição curta (3-5 palavras).

## Pull Request

- Título: igual ao primeiro commit em Conventional Commit format.
- Descrição: o que muda, por quê, screenshots se UI.
- Linka spec se feature: "Implementa `specs/comprar-pontos.md`".
- Self-review antes de pedir merge. Lê o diff antes.

## Não fazer

- Não force push em `main` jamais.
- Não commitar `console.log` ou `print debug`. Tira antes.
- Não commitar `.env` ou secret de qualquer tipo. Se commitou por engano,
  rotaciona o segredo imediatamente.
- Não commits gigantes (>500 linhas). Quebra em PRs menores.
- Não commit "WIP" em main. WIP fica em branch.
- Não merge PR sem CI verde.
- Não usa `--no-verify` pra pular hooks pre-commit. Hooks existem por motivo.

## Quando reverter

- Bug crítico em produção: `git revert <sha>` da merge commit, deploy ASAP.
- Reverter no `main` é OK e esperado. Não tem vergonha disso.
