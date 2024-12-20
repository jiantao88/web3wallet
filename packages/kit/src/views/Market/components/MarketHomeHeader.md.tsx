import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { Page, SizableText, Stack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { MarketHomeHeaderSearchBar } from './MarketHomeHeaderSearchBar';

export function MarketHomeHeader() {
  const intl = useIntl();

  const renderLeft = useCallback(
    () => (
      null
    ),
    [],
  );
  const renderHeaderRight = useCallback(() => null, []);
  return (
    <>
      <Page.Header
        title={intl.formatMessage({
          id: ETranslations.global_market,
        })}
        headerTitleAlign='center'
        headerLeft={renderLeft}
        headerRight={renderHeaderRight}
      />
      <Stack px="$5" pb="$3">
        <MarketHomeHeaderSearchBar />
      </Stack>
    </>
  );
}
