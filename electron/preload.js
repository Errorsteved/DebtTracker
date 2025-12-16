import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('dbApi', {
  load: () => ipcRenderer.invoke('db:load'),
  flush: state => ipcRenderer.invoke('db:flush', state),
  getStatus: () => ipcRenderer.invoke('db:getStatus'),
});
