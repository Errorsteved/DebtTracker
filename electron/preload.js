import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dbApi', {
  getAccounts: () => ipcRenderer.sendSync('db:getAccounts'),
  saveAccounts: accounts => ipcRenderer.sendSync('db:saveAccounts', accounts),
  getCurrentAccountId: () => ipcRenderer.sendSync('db:getCurrentAccountId'),
  setCurrentAccountId: id => ipcRenderer.sendSync('db:setCurrentAccountId', id),
  getTransactions: () => ipcRenderer.sendSync('db:getTransactions'),
  saveTransactions: transactions => ipcRenderer.sendSync('db:saveTransactions', transactions),
  getSettings: () => ipcRenderer.sendSync('db:getSettings'),
  saveSettings: settings => ipcRenderer.sendSync('db:saveSettings', settings),
});
