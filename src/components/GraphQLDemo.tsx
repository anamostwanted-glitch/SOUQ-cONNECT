import React from 'react';
import { useQuery } from '@apollo/client/react/index.js';
import { gql } from '@apollo/client/core/index.js';
import OptimizedImage from './OptimizedImage';

// 1. GraphQL Query (Fetch only what you need)
// Here we only ask for name, bio, and avatar.
const GET_ME = gql`
  query GetMe {
    me {
      name
      bio
      avatar
    }
  }
`;

const GraphQLDemo: React.FC = () => {
  const { loading, error, data } = useQuery<{ me: any }>(GET_ME);

  if (loading) return <div className="animate-pulse h-20 bg-gray-200 rounded-xl"></div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  const { me } = data;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex items-center gap-4">
      <OptimizedImage 
        src={me.avatar} 
        alt={me.name} 
        className="w-16 h-16 rounded-full object-cover"
        width={64}
        height={64}
      />
      <div>
        <h3 className="font-bold text-lg text-gray-900">{me.name}</h3>
        <p className="text-sm text-gray-500">{me.bio}</p>
        <div className="mt-2 text-[10px] uppercase tracking-widest text-brand-primary font-bold">
          Fetched via GraphQL (Optimized)
        </div>
      </div>
    </div>
  );
};

export default GraphQLDemo;
