import React from 'react';
import { UserProfile, MarketplaceItem } from '../../../core/types';
import { ConnectStorefront } from '../../common/components/ConnectStorefront';
import { TooltipProvider } from "../../../shared/components/ui/tooltip";

export const CustomerProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct, isAdmin, ...editProps } = props;

  return (
    <TooltipProvider>
      <ConnectStorefront 
        profile={profile}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
        {...editProps}
      />
    </TooltipProvider>
  );
};

export const SupplierProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct, isAdmin, ...editProps } = props;

  return (
    <TooltipProvider>
      <ConnectStorefront 
        profile={profile}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
        {...editProps}
      />
    </TooltipProvider>
  );
};

export const AdminProfileLayout = (props: any) => {
  const { profile, isOwner, onBack, onViewProduct, isAdmin, ...editProps } = props;

  return (
    <TooltipProvider>
      <ConnectStorefront 
        profile={profile}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onBack={onBack}
        onViewProduct={onViewProduct}
        onOpenChat={(id) => console.log('Open chat with', id)}
        {...editProps}
      />
    </TooltipProvider>
  );
};
