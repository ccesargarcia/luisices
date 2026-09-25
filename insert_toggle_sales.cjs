const fs = require('fs');
const file = 'src/app/pages/StoreCustomization.tsx';
let content = fs.readFileSync(file, 'utf8');

const toggleFn = `
  const [togglingSales, setTogglingSales] = useState(false);
  const handleToggleSales = async (enable: boolean) => {
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar configurações da loja');
      return;
    }
    setTogglingSales(true);
    const updatedFlags = { ...featureFlags, enableOnlineOrders: enable };
    setFeatureFlags(updatedFlags);
    try {
      // Just update the featureFlags field in the document
      await setDoc(doc(db, \`users/\${userProfile?.uid}/settings/profile\`), { featureFlags: updatedFlags }, { merge: true });
      await setDoc(doc(db, 'storeSettings/public'), { featureFlags: updatedFlags }, { merge: true });
      try {
        const cached = localStorage.getItem("luisices_public_store_settings");
        const parsed = cached ? JSON.parse(cached) : {};
        parsed.featureFlags = updatedFlags;
        localStorage.setItem("luisices_public_store_settings", JSON.stringify(parsed));
      } catch {}
      if (enable) {
        toast.success("🔵 Vendas retomadas! O catálogo está recebendo pedidos.");
      } else {
        toast.warning("🟠 Vendas pausadas! O catálogo continua visível mas sem botões de compra.");
      }
    } catch (err) {
      console.error("Erro ao alternar vendas da loja:", err);
      setFeatureFlags(featureFlags);
      toast.error("Erro ao atualizar status de vendas.");
    } finally {
      setTogglingSales(false);
    }
  };
`;

content = content.replace(
  /const \[storeUnpublishMessage, setStoreUnpublishMessage\] = useState<string>\(''\);/,
  toggleFn + '\n  const [storeUnpublishMessage, setStoreUnpublishMessage] = useState<string>(\'\');'
);

content = content.replace(
  /onClick=\{\(\) => \{\n\s*setFeatureFlags.*\n\s*handleSave.*\n\s*\}\}/,
  'onClick={() => handleToggleSales(featureFlags.enableOnlineOrders === false)}'
);

fs.writeFileSync(file, content);
console.log('Added handleToggleSales');
