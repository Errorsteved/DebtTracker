import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dbApi', {
  getAccounts: () => ipcRenderer.invoke('db:getAccounts'),
  saveAccounts: accounts => ipcRenderer.invoke('db:saveAccounts', accounts),
  getCurrentAccountId: () => ipcRenderer.invoke('db:getCurrentAccountId'),
  setCurrentAccountId: id => ipcRenderer.invoke('db:setCurrentAccountId', id),
  getTransactions: () => ipcRenderer.invoke('db:getTransactions'),
  saveTransactions: transactions => ipcRenderer.invoke('db:saveTransactions', transactions),
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: settings => ipcRenderer.invoke('db:saveSettings', settings),
  getFullState: () => ipcRenderer.invoke('db:getFullState'),
  saveFullState: state => ipcRenderer.invoke('db:saveFullState', state),
  getStatus: () => ipcRenderer.invoke('db:getStatus'),
});
