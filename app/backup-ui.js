window.PadelstarBackupUi = (() => {
  function create({ backupFormat, elements, getState, render, saveState, setLocalRole, showToast, showWorkspace, slugify, setState, t }) {
    function exportBackup() {
      const state = getState();
      const file = new Blob([backupFormat.serialize(state)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = `${slugify(state.name)}-${state.inviteCode}-backup.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    function importBackup(event) {
      const [file] = event.currentTarget.files;
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          setState(backupFormat.parse(reader.result));
          setLocalRole("admin");
          saveState();
          showWorkspace("admin");
          render();
          elements.copyStatus.textContent = t("messages.backupImported");
        } catch {
          showToast(t("messages.importBackupFailed"), "status-message-error");
        } finally {
          event.currentTarget.value = "";
        }
      });
      reader.readAsText(file);
    }

    return { exportBackup, importBackup };
  }
  return { create };
})();
