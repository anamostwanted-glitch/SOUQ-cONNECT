import React from 'react';
import { UserProfile, MarketplaceItem } from '../../../core/types';
import { NexusStorefront } from '../../common/components/NexusStorefront';
import { TooltipProvider } from "../../../shared/components/ui/tooltip";

export const CustomerProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct } = props;

  return (
    <TooltipProvider>
      <NexusStorefront 
        profile={profile}
        isOwner={isOwner}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
      />
    </TooltipProvider>
  );
};

export const SupplierProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct } = props;

  return (
    <TooltipProvider>
      <NexusStorefront 
        profile={profile}
        isOwner={isOwner}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
      />
    </TooltipProvider>
  );
};

export const AdminProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct } = props;

  return (
    <TooltipProvider>
      <NexusStorefront 
        profile={profile}
        isOwner={isOwner}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
      />
    </TooltipProvider>
  );
};
