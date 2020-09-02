<script>
	let deferredInstallPrompt = null;
	let installButton = false;

	function saveBeforeInstallPromptEvent(event) {
		deferredInstallPrompt = event;
		installButton = true;
	}

	function installPWA(event) {
		deferredInstallPrompt.prompt();
		installButton = false;

		deferredInstallPrompt.userChoice.then(choice => {
			if (choice.outcome === 'accepted') {
				console.log('User accepted the A2HS prompt', choice);
			} else {
				console.log('User dismissed the A2HS prompt', choice);
			}
			deferredInstallPrompt = null;
		});
	}

	function logAppInstalled(event) {
		console.log('Weather App was installed.', event);
	}

	window.addEventListener('beforeinstallprompt', saveBeforeInstallPromptEvent);
	window.addEventListener('appinstalled', logAppInstalled);
</script>

{#if deferredInstallPrompt}
	<button id="butInstall" on:click={installPWA}>Install</button>
{/if}