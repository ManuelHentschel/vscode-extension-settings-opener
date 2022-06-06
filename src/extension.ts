import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extensionSettingsOpener.openExtensionSettings', () => {
		void openExtensionSettings();
	}));
}

interface QuickPickExt extends vscode.QuickPickItem, ExtensionInfo {}

async function openExtensionSettings() {
	
	//todo: handle these:
	const config = vscode.workspace.getConfiguration('extensionSettingsOpener');
	let showEmptyExtensions = config.get('showExtensionsWithoutConfig', false);
	let showInternalExtensions = config.get('showInternalExtensions', false);

	const extInfos = parseExtList();

	const qpItems = extInfos.map((ext) => (<QuickPickExt>{
		...ext,
		label: ext.name,
		description: ext.id,
		detail: ext.detail,
	}));
	
	const btnShowInternal = makeButton('folder', 'Show internal extensions');
	const btnHideInternal = makeButton('folder-opened', 'Hide internal extensions');
	const btnShowEmpty = makeButton('bracket-error', 'Show empty configurations');
	const btnHideEmpty = makeButton('bracket', 'Hide empty configurations');
	
	const qp = vscode.window.createQuickPick<QuickPickExt>();
	qp.matchOnDescription = true;
	qp.canSelectMany = false;
	qp.keepScrollPosition = true;

	function updateQuickPick() {
		qp.buttons = [
			showInternalExtensions ? btnHideInternal : btnShowInternal,
			showEmptyExtensions ? btnHideEmpty : btnShowEmpty
		];
		let newItems = qpItems;
		if(!showInternalExtensions){
			newItems = newItems.filter(ei => !ei.isInternal);
		}
		if(!showEmptyExtensions){
			newItems = newItems.filter(ei => ei.hasConfig);
		}
		qp.items = newItems;
	}
	qp.onDidTriggerButton(e => {
		if(e.tooltip === btnShowInternal.tooltip){
			showInternalExtensions = true;
		} else if(e.tooltip === btnHideInternal.tooltip){
			showInternalExtensions = false;
		} else if(e.tooltip === btnHideEmpty.tooltip){
			showEmptyExtensions = false;
		} else if(e.tooltip === btnShowEmpty.tooltip){
			showEmptyExtensions = true;
		}
		updateQuickPick();
	});
	const qpPromise = new Promise<string | undefined>(resolve => {
		qp.onDidAccept(() => resolve(qp.selectedItems[0].id));
	});

	updateQuickPick();
	qp.show();
	
	const id: string | undefined = await qpPromise;
	if(id){
		vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${id}`);
	}
}

function makeButton(iconId: string, tooltip?: string): vscode.QuickInputButton{
	return {
		iconPath: new vscode.ThemeIcon(iconId),
		tooltip: tooltip
	};
}

interface ExtensionInfo {
	id: string;
	publisher: string;
	name: string;
	hasConfig: boolean;
	isInternal: boolean;
	detail?: string;
}

function parseExtList() {
	const exts = vscode.extensions.all;
	let extInfos = exts
		.map(parseExt)
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
		isInternal: publisher === 'vscode',
		detail: detail
	};
	return ret;
}

export function deactivate() {}
