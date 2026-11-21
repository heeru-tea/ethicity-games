# Korean / English game presentation

Both `rights-preview` and `publicness-preview` load `messages.js` and `runtime.js` before their game scripts. The in-game language menu switches immediately, without restarting the game. Each game remembers its language preference separately. Scenario IDs, decisions, scores, facilities and saved progress keep their original representation.

Edit English wording in `en.json`, then run:

```
node shared/i18n/build.cjs
node shared/i18n/test.cjs
```

Translate complete sentences before shorter dynamic fragments. Canvas labels, accessible descriptions, confirmation dialogs and learning-record downloads use the same dictionary. Korean source content remains the reference for switching back.

Learner input must remain unchanged: use `data-user-text` on displayed input, `EthicityI18n.userText()` for canvas input, and pass learner values to `EthicityI18n.record()` for downloads. Never translate choice IDs or saved state.

English wording targets Grades 5–6: use short sentences and concrete actions. Explain evidence as clues, describe face checks before using technical labels, and explain importance points before asking learners to assign them. Keep official principle names, but explain their meaning through the story. Preserve every choice's meaning, including choices that lead to an incomplete outcome. Translate complete dynamic instructions (counts, places and score feedback) before fragments, and check one/many wording. Export park plans using readable facility names rather than internal IDs or raw JSON.
