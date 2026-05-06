const KEY = 'splid_v1';

const StorageService = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : { groups: [] };
    } catch {
      return { groups: [] };
    }
  },

  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  },

  exportJSON() {
    const raw = localStorage.getItem(KEY) || '{"groups":[]}';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splid-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data.groups)) throw new Error('Invalid backup file.');
    this.save(data);
    return data;
  },
};

export default StorageService;
