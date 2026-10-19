-- Materialize the legacy display-name fallback once, then workspace names are independent.
UPDATE workspaces w SET name=c.name FROM cita_clinics c WHERE c.workspace_id=w.id AND w.name='Mi espacio';
UPDATE workspaces w SET name=q.name FROM "TurnQueue" q WHERE q."workspaceId"=w.id AND w.name='Mi espacio';
