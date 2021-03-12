import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extensionSettingsOpener.openExtensionSettings', () => {
		void openExtensionSettings();
	}));
}

async function openExtensionSettings() {
	const extList = vscode.extensions.all;
	const config = vscode.workspace.getConfiguration('extensionSettingsOpener');
	const extInfos = parseExtList(
		extList,
		config.get('showExtensionsWithoutConfig', false),
		config.get('showInternalExtensions', false)
	);
	const qpOptions: vscode.QuickPickOptions = {
		matchOnDescription: true
	};
	const qpItems = extInfos.map((ext) => (<vscode.QuickPickItem & {id: string}>{
		label: ext.name,
		description: ext.id,
		detail: ext.detail,
		id: ext.id
	}));
	const qp = await vscode.window.showQuickPick(qpItems, qpOptions);
	if(qp){
		vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${qp.id}`);
	}
}

interface ExtensionInfo {
	id: string;
	publisher: string;
	name: string;
	hasConfig: boolean;
	detail?: string;
}

function parseExtList(exts: readonly vscode.Extension<any>[], showMissingConfigs: boolean = false, showInternal: boolean = false) {
	let extInfos = exts
		.map(parseExt)
		.filter((ei) => ei.hasConfig || showMissingConfigs)
		.filter((ei) => ei.publisher !== 'vscode' || showInternal)
		.sort((a,b) => a.name.localeCompare(b.name));

	return extInfos;
}

function parseExt(ext: vscode.Extension<any>): ExtensionInfo {
	const id = ext.id;
	const publisher = ext.packageJSON.publisher;
	const name = ext.packageJSON.displayName || ext.packageJSON.name;
	const hasConfig = !!ext.packageJSON.contributes?.configuration;
	const detail = ext.packageJSON.description;
	const ret: ExtensionInfo = {
		id: id,
		publisher: publisher,
		name: name,
		hasConfig: hasConfig,
		detail: detail
	};
	return ret;
}

export function deactivate() {}
