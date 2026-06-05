-- Contrainte UNIQUE sur whatsapp pour appliquer la règle "1 prono par numéro"
ALTER TABLE prono_wc2026 ADD CONSTRAINT prono_unique_whatsapp UNIQUE (whatsapp);
