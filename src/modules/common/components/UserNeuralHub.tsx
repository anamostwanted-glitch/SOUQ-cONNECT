import React from 'react';

export const UserNeuralHub: React.FC<{ profile: any; isRtl: boolean }> = ({ profile, isRtl }) => {
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-lg font-bold">{isRtl ? 'المركز العصبي' : 'Neural Hub'}</h2>
      <p>{isRtl ? 'قيد التطوير...' : 'Under development...'}</p>
    </div>
  );
};
