(function attachAppInit(global) {
  function create({ windowRef = global, callbacks } = {}) {
    function initialize() {
      callbacks.installGlobalHandlers();
      callbacks.initializeNavigation();
      callbacks.applyTheme();
      callbacks.activateSupabase();
      callbacks.bindSupabaseReady();
      callbacks.syncLanguageOptions();
      callbacks.syncCreateFormDefaults();
      callbacks.syncJoinFormFromProfile();
      callbacks.syncJoinPreview();
      callbacks.renderProfile();
      callbacks.prefillInviteCodeFromUrl();
      callbacks.syncCopyrightYear();
      callbacks.registerServiceWorker();
      callbacks.initializePwaInstall();
      callbacks.syncConnectionStatus();
      callbacks.bindAccountAuth();
      callbacks.refreshAccountAuth();
      callbacks.showRecoveryNotice();
      callbacks.bindBootstrapEvents();
      callbacks.bindTournamentEntry();
      callbacks.bindAdminFormEvents();
      callbacks.bindWorkspaceEvents();
      callbacks.bindGlobalEvents();
    }

    return Object.freeze({ initialize });
  }

  global.PadelstarAppInit = Object.freeze({ create });
}(window));
