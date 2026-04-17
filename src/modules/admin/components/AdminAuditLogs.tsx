import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { AuditLog } from '../../../core/services/auditService';
import { Loader2, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { handleFirestoreError, OperationType } from '../../../core/utils/errorHandling';

export const AdminAuditLogs: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog & { id: string }));
      setLogs(logsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs', false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  return (
    <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-brand-border">
        <History className="text-brand-primary" size={24} />
        <h2 className="text-xl font-bold text-brand-text-main">
          {isRtl ? 'سجل التدقيق' : 'Audit Logs'}
        </h2>
      </div>
      <div className="space-y-4">
        {logs.map((log: any) => (
          <div key={log.id} className="p-4 bg-brand-background rounded-xl border border-brand-border flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-brand-text-main">{log.action}</p>
              <p className="text-xs text-brand-text-muted">{log.resource}</p>
            </div>
            <p className="text-xs text-brand-text-muted">{new Date(log.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
