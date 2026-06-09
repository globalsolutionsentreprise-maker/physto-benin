@AGENTS.md

## Skill routing

When the user's request matches an available agent or skill, invoke it proactively. Don't wait for the user to ask.

Key routing rules:
- Bug reported / something broken / page not loading → invoke bug-investigator agent
- Before or after a commit/deploy → invoke code-reviewer agent
- "commite et déploie" / "déploie" / "mets en prod" → invoke deploy-helper agent
- New table / migration / Supabase query → invoke supabase-expert agent
- "vérifie que ça marche" / after UI changes → invoke ui-qa agent
- Investigating a bug or error → invoke /investigate skill
- Code review / diff check → invoke /review skill
- Ship / deploy → invoke /land-and-deploy skill

## SELF-LEARNING

Ce projet maintient un journal d'apprentissage dans tasks/lessons.md.

### Règles impératives

1. Au démarrage de chaque session, avant TOUTE autre action : lire tasks/lessons.md intégralement.

2. Avant de modifier du code, relire les règles de tasks/lessons.md et les appliquer. Chaque règle est non-négociable.

3. Après chaque correction de l'utilisateur, ajouter immédiatement une entrée à tasks/lessons.md au format :

   [YYYY-MM-DD] | ce qui s'est mal passé | règle à suivre la prochaine fois

### Contraintes

- Ne jamais supprimer ou réorganiser les entrées existantes sans demande explicite.
- Ne jamais considérer une règle comme obsolète de sa propre initiative.
- Si tasks/lessons.md n'existe pas, le créer avant de continuer.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
