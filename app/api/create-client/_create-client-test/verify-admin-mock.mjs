// Mock de @/lib/verify-admin pour les tests hors ligne.
// Refuse si __TEST_ADMIN_OK === "0", sinon renvoie un faux utilisateur admin.
export async function verifyAdmin() {
  if (process.env.__TEST_ADMIN_OK === "0") return null;
  return { id: "admin-1", email: "admin@phyto-benin.com", acces_role: "admin" };
}

// Garde d'écriture (rôle admin) : même comportement en test (compte admin).
export async function verifyAdminWrite() {
  const u = await verifyAdmin();
  return u && u.acces_role === "admin" ? u : null;
}
