import { assign, isEmpty, isNil, uniqBy } from 'lodash';

import { backgroundMethod } from '@onekeyhq/shared/src/background/backgroundDecorators';
import { OneKeyInternalError } from '@onekeyhq/shared/src/errors';
import { buildAccountLocalAssetsKey } from '@onekeyhq/shared/src/utils/accountUtils';
import type { IAccountHistoryTx } from '@onekeyhq/shared/types/history';
import type { IDecodedTxAction } from '@onekeyhq/shared/types/tx';
import { EDecodedTxStatus } from '@onekeyhq/shared/types/tx';

import { SimpleDbEntityBase } from '../base/SimpleDbEntityBase';

export interface ILocalHistory {
  pendingTxs: Record<string, IAccountHistoryTx[]>; // Record<networkId_accountAddress/xpub, IAccountHistoryTx[]>
  confirmedTxs: Record<string, IAccountHistoryTx[]>; // Record<networkId_accountAddress/xpub, IAccountHistoryTx[]>
}

export class SimpleDbEntityLocalHistory extends SimpleDbEntityBase<ILocalHistory> {
  entityName = 'localHistory';

  override enableCache = false;

  @backgroundMethod()
  public async getLocalHistoryTxById({
    networkId,
    accountAddress,
    xpub,
    historyId,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    historyId: string;
  }) {
    if (!accountAddress && !xpub) {
      throw new OneKeyInternalError('accountAddress or xpub is required');
    }

    const key = buildAccountLocalAssetsKey({ networkId, accountAddress, xpub });

    const rawData = await this.getRawData();

    const pendingTxs = rawData?.pendingTxs?.[key] || [];
    const confirmedTxs = rawData?.confirmedTxs?.[key] || [];

    return [...pendingTxs, ...confirmedTxs].find((tx) => tx.id === historyId);
  }

  @backgroundMethod()
  public async saveLocalHistoryPendingTxs({
    networkId,
    accountAddress,
    xpub,
    txs,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    txs: IAccountHistoryTx[];
  }) {
    return this.saveLocalHistoryTxs({
      networkId,
      accountAddress,
      xpub,
      pendingTxs: txs,
    });
  }

  @backgroundMethod()
  public async saveLocalHistoryConfirmedTxs({
    networkId,
    accountAddress,
    xpub,
    txs,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    txs: IAccountHistoryTx[];
  }) {
    return this.saveLocalHistoryTxs({
      networkId,
      accountAddress,
      xpub,
      confirmedTxs: txs,
    });
  }

  @backgroundMethod()
  public async updateLocalHistoryConfirmedTxs({
    networkId,
    accountAddress,
    xpub,
    confirmedTxsToSave,
    confirmedTxsToRemove,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    confirmedTxsToSave?: IAccountHistoryTx[];
    confirmedTxsToRemove?: IAccountHistoryTx[];
  }) {
    return this.batchUpdateLocalHistoryTxs([
      {
        networkId,
        accountAddress,
        xpub,
        confirmedTxsToSave,
        confirmedTxsToRemove,
      },
    ]);
  }

  @backgroundMethod()
  public async saveLocalHistoryTxs({
    networkId,
    accountAddress,
    xpub,
    pendingTxs,
    confirmedTxs,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    pendingTxs?: IAccountHistoryTx[];
    confirmedTxs?: IAccountHistoryTx[];
  }) {
    if (!accountAddress && !xpub) {
      throw new OneKeyInternalError('accountAddress or xpub is required');
    }

    const key = buildAccountLocalAssetsKey({ networkId, accountAddress, xpub });

    if (isEmpty(pendingTxs) && isEmpty(confirmedTxs)) return;
    const now = Date.now();
    const rawData = await this.getRawData();

    let finalPendingTxs = rawData?.pendingTxs[key] ?? [];
    let finalConfirmedTxs = rawData?.confirmedTxs[key] ?? [];

    if (pendingTxs) {
      finalPendingTxs = uniqBy(
        [
          ...pendingTxs.map((tx) => ({
            ...tx,
            decodedTx: {
              ...tx.decodedTx,
              createdAt: now,
              updatedAt: now,
            },
          })),
          ...finalPendingTxs,
        ],
        (tx) => tx.id,
      ).filter((tx) => tx.decodedTx.status === EDecodedTxStatus.Pending);
    }

    if (confirmedTxs) {
      finalConfirmedTxs = uniqBy(
        [...confirmedTxs, ...finalConfirmedTxs],
        (tx) => tx.id,
      ).filter((tx) => tx.decodedTx.status !== EDecodedTxStatus.Pending);
    }

    return this.setRawData({
      ...(rawData ?? {}),
      pendingTxs: assign({}, rawData?.pendingTxs, { [key]: finalPendingTxs }),
      confirmedTxs: assign({}, rawData?.confirmedTxs, {
        [key]: finalConfirmedTxs.slice(0, 50),
      }),
    });
  }

  @backgroundMethod()
  public async updateLocalHistoryPendingTxs({
    networkId,
    accountAddress,
    xpub,
    confirmedTxs,
    onChainHistoryTxs,
    pendingTxs: pendingTxsFromOut,
  }: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    confirmedTxs?: IAccountHistoryTx[];
    onChainHistoryTxs?: IAccountHistoryTx[];
    pendingTxs?: IAccountHistoryTx[];
  }) {
    return this.batchUpdateLocalHistoryTxs([
      {
        networkId,
        accountAddress,
        xpub,
        confirmedTxs,
        onChainHistoryTxs,
        pendingTxs: pendingTxsFromOut,
      },
    ]);
  }

  @backgroundMethod()
  async batchUpdateLocalHistoryTxs(
    params: {
      networkId: string;
      accountAddress?: string;
      xpub?: string;
      confirmedTxs?: IAccountHistoryTx[];
      onChainHistoryTxs?: IAccountHistoryTx[];
      pendingTxs?: IAccountHistoryTx[];
      confirmedTxsToSave?: IAccountHistoryTx[];
      confirmedTxsToRemove?: IAccountHistoryTx[];
    }[],
  ) {
    const rawData = await this.getRawData();

    const pendingTxsToUpdateMap: Record<string, IAccountHistoryTx[]> = {};
    const confirmedTxsToUpdateMap: Record<string, IAccountHistoryTx[]> = {};

    for (const param of params) {
      const {
        networkId,
        accountAddress,
        xpub,
        confirmedTxs,
        onChainHistoryTxs,
        pendingTxs: pendingTxsFromOut,
        confirmedTxsToSave,
        confirmedTxsToRemove,
      } = param;
      if (!accountAddress && !xpub) {
        throw new OneKeyInternalError('accountAddress or xpub is required');
      }
      const key = buildAccountLocalAssetsKey({
        networkId,
        accountAddress,
        xpub,
      });

      // pendingTxsToUpdate build
      let pendingTxsToUpdate: IAccountHistoryTx[] | undefined;
      const currentPendingTxs = rawData?.pendingTxs?.[key];
      if (pendingTxsFromOut) {
        if (isEmpty(pendingTxsFromOut) && isEmpty(currentPendingTxs)) {
          pendingTxsToUpdate = undefined;
        } else {
          pendingTxsToUpdate = pendingTxsFromOut;
        }
      } else {
        // eslint-disable-next-line no-lonely-if
        if (isEmpty(confirmedTxs) && isEmpty(onChainHistoryTxs)) {
          pendingTxsToUpdate = undefined;
        } else if (currentPendingTxs?.length) {
          //
          const newPendingTxs: IAccountHistoryTx[] = [];
          for (const pendingTx of currentPendingTxs) {
            const onChainHistoryTx = onChainHistoryTxs?.find(
              (item) =>
                item.id === pendingTx.id ||
                (item.originalId && item.originalId === pendingTx.id),
            );

            const confirmedTx = confirmedTxs?.find(
              (item) =>
                item.id === pendingTx.id ||
                (item.originalId && item.originalId === pendingTx.id),
            );

            if (!onChainHistoryTx && !confirmedTx) {
              newPendingTxs.push(pendingTx);
            }
          }
          pendingTxsToUpdate = newPendingTxs;
        }
      }
      if (pendingTxsToUpdate) {
        pendingTxsToUpdateMap[key] = pendingTxsToUpdate;
      }

      // confirmedTxsToUpdate build
      let confirmedTxsToUpdate: IAccountHistoryTx[] | undefined;
      if (isEmpty(confirmedTxsToSave) && isEmpty(confirmedTxsToRemove)) {
        confirmedTxsToUpdate = undefined;
      } else {
        let finalConfirmedTxs = rawData?.confirmedTxs?.[key] || [];
        finalConfirmedTxs = uniqBy(
          [...(confirmedTxsToSave ?? []), ...finalConfirmedTxs],
          (tx) => tx.id,
        );
        if (confirmedTxsToRemove && !isEmpty(confirmedTxsToRemove)) {
          finalConfirmedTxs = finalConfirmedTxs.filter(
            (tx) => !confirmedTxsToRemove.find((item) => item.id === tx.id),
          );
        }
        confirmedTxsToUpdate = finalConfirmedTxs.slice(0, 50);
      }
      if (confirmedTxsToUpdate) {
        confirmedTxsToUpdateMap[key] = confirmedTxsToUpdate;
      }
    }

    if (isEmpty(pendingTxsToUpdateMap) && isEmpty(confirmedTxsToUpdateMap)) {
      return;
    }

    return this.setRawData({
      ...rawData,
      pendingTxs: assign({}, rawData?.pendingTxs, pendingTxsToUpdateMap),
      confirmedTxs: assign({}, rawData?.confirmedTxs, confirmedTxsToUpdateMap),
    });
  }

  @backgroundMethod()
  public async updateLocalHistoryConfirmedTxStatus(params: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    txid: string;
    status: EDecodedTxStatus;
  }) {
    const { networkId, accountAddress, xpub, txid, status } = params;

    if (!accountAddress && !xpub) {
      throw new OneKeyInternalError('accountAddress or xpub is required');
    }
    const key = buildAccountLocalAssetsKey({ networkId, accountAddress, xpub });

    const rawData = await this.getRawData();

    const confirmedTxs = rawData?.confirmedTxs?.[key] || [];

    const targetTxIndex = confirmedTxs.findIndex(
      (tx) => tx.decodedTx.txid === txid,
    );

    if (
      targetTxIndex === -1 ||
      confirmedTxs[targetTxIndex].decodedTx.status === status
    )
      return;

    const updatedConfirmedTxs = [...confirmedTxs];
    updatedConfirmedTxs[targetTxIndex] = {
      ...updatedConfirmedTxs[targetTxIndex],
      decodedTx: {
        ...updatedConfirmedTxs[targetTxIndex].decodedTx,
        status,
      },
    };

    return this.setRawData({
      pendingTxs: rawData?.pendingTxs || {},
      confirmedTxs: assign({}, rawData?.confirmedTxs, {
        [key]: updatedConfirmedTxs,
      }),
    });
  }

  @backgroundMethod()
  public async getAccountsLocalHistoryPendingTxs(
    params: {
      networkId: string;
      accountAddress: string;
      xpub?: string;
      tokenIdOnNetwork?: string;
    }[],
  ) {
    params.forEach(({ accountAddress, xpub }) => {
      if (!accountAddress && !xpub) {
        throw new OneKeyInternalError('accountAddress or xpub is required');
      }
    });

    const pendingTxs = (await this.getRawData())?.pendingTxs;

    let accountsPendingTxs = params.flatMap(
      ({ networkId, accountAddress, xpub }) => {
        const key = buildAccountLocalAssetsKey({
          networkId,
          accountAddress,
          xpub,
        });
        return pendingTxs?.[key] ?? [];
      },
    );

    accountsPendingTxs = this._arrangeLocalTxs({
      txs: accountsPendingTxs,
    });

    return accountsPendingTxs;
  }

  @backgroundMethod()
  public async getAccountLocalHistoryPendingTxs(params: {
    networkId: string;
    accountAddress: string;
    xpub?: string;
    tokenIdOnNetwork?: string;
  }) {
    const { accountAddress, xpub, networkId, tokenIdOnNetwork } = params;

    if (!accountAddress && !xpub) {
      throw new OneKeyInternalError('accountAddress or xpub is required');
    }

    const key = buildAccountLocalAssetsKey({ networkId, accountAddress, xpub });

    let accountPendingTxs = (await this.getRawData())?.pendingTxs[key] ?? [];

    accountPendingTxs = this._arrangeLocalTxs({
      txs: accountPendingTxs,
      tokenIdOnNetwork,
    });

    return accountPendingTxs;
  }

  @backgroundMethod()
  public async getAccountLocalHistoryConfirmedTxs(params: {
    networkId: string;
    accountAddress?: string;
    xpub?: string;
    tokenIdOnNetwork?: string;
  }) {
    const { accountAddress, xpub, networkId, tokenIdOnNetwork } = params;

    if (!accountAddress && !xpub) {
      throw new OneKeyInternalError('accountAddress or xpub is required');
    }

    const key = buildAccountLocalAssetsKey({ networkId, accountAddress, xpub });

    let accountConfirmedTxs =
      (await this.getRawData())?.confirmedTxs[key] || [];

    accountConfirmedTxs = this._arrangeLocalTxs({
      txs: accountConfirmedTxs,
      tokenIdOnNetwork,
    });

    return accountConfirmedTxs;
  }

  @backgroundMethod()
  public async getAccountsLocalHistoryConfirmedTxs(
    params: {
      networkId: string;
      accountAddress?: string;
      xpub?: string;
      tokenIdOnNetwork?: string;
    }[],
  ) {
    params.forEach(({ accountAddress, xpub }) => {
      if (!accountAddress && !xpub) {
        throw new OneKeyInternalError('accountAddress or xpub is required');
      }
    });

    const confirmedTxs = (await this.getRawData())?.confirmedTxs;

    let accountsConfirmedTxs = params.flatMap(
      ({ networkId, accountAddress, xpub }) => {
        const key = buildAccountLocalAssetsKey({
          networkId,
          accountAddress,
          xpub,
        });
        return confirmedTxs?.[key] ?? [];
      },
    );

    accountsConfirmedTxs = this._arrangeLocalTxs({
      txs: accountsConfirmedTxs,
    });

    return accountsConfirmedTxs;
  }

  @backgroundMethod()
  async getPendingNonceList(props: {
    networkId: string;
    accountAddress: string;
    xpub?: string;
  }): Promise<number[]> {
    const { accountAddress, xpub, networkId } = props;
    const pendingTxs = await this.getAccountLocalHistoryPendingTxs({
      accountAddress,
      xpub,
      networkId,
    });
    const nonceList = pendingTxs.map((tx) => tx.decodedTx.nonce);
    return nonceList || [];
  }

  @backgroundMethod()
  async getMaxPendingNonce(props: {
    networkId: string;
    accountAddress: string;
    xpub?: string;
  }): Promise<number | null> {
    const nonceList = await this.getPendingNonceList(props);
    if (nonceList.length) {
      const nonce = Math.max(...nonceList);
      if (Number.isNaN(nonce) || nonce === Infinity || nonce === -Infinity) {
        return null;
      }
      return nonce;
    }
    return null;
  }

  @backgroundMethod()
  async getMinPendingNonce(props: {
    networkId: string;
    accountAddress: string;
    xpub?: string;
  }): Promise<number | null> {
    const nonceList = await this.getPendingNonceList(props);
    if (nonceList.length) {
      const nonce = Math.min(...nonceList);
      if (Number.isNaN(nonce) || nonce === Infinity || nonce === -Infinity) {
        return null;
      }
      return nonce;
    }
    return null;
  }

  @backgroundMethod()
  async clearLocalHistoryPendingTxs() {
    return this.setRawData((rawData) => {
      const confirmedTxs = rawData?.confirmedTxs || {};
      return {
        ...(rawData ?? {}),
        pendingTxs: {},
        confirmedTxs,
      };
    });
  }

  @backgroundMethod()
  async clearLocalHistory() {
    return this.setRawData({
      pendingTxs: {},
      confirmedTxs: {},
    });
  }

  _getAccountLocalHistoryTxs(params: {
    networkId: string;
    accountAddress: string;
    xpub?: string;
    txs: IAccountHistoryTx[];
  }) {
    const { accountAddress, xpub, networkId, txs } = params;

    if (xpub) {
      return txs.filter(
        (tx) =>
          tx.decodedTx.xpub?.toLowerCase() === xpub.toLowerCase() &&
          tx.decodedTx.networkId === networkId,
      );
    }

    return txs.filter(
      (tx) =>
        tx.decodedTx.owner.toLowerCase() === accountAddress.toLowerCase() &&
        tx.decodedTx.networkId === networkId,
    );
  }

  _checkIsActionIncludesToken(params: {
    historyTx: IAccountHistoryTx;
    action: IDecodedTxAction;
    tokenIdOnNetwork: string;
  }) {
    const { action, tokenIdOnNetwork, historyTx } = params;

    const { assetTransfer, tokenApprove } = action;

    return (
      assetTransfer?.sends.find(
        (send) => send.tokenIdOnNetwork === tokenIdOnNetwork,
      ) ||
      assetTransfer?.receives.find(
        (receive) => receive.tokenIdOnNetwork === tokenIdOnNetwork,
      ) ||
      tokenApprove?.tokenIdOnNetwork === tokenIdOnNetwork ||
      (historyTx.decodedTx?.tokenIdOnNetwork === tokenIdOnNetwork &&
        tokenIdOnNetwork)
    );
  }

  _arrangeLocalTxs({
    txs,
    tokenIdOnNetwork,
  }: {
    txs: IAccountHistoryTx[];
    tokenIdOnNetwork?: string;
  }) {
    let result = txs.sort(
      (b, a) =>
        (a.decodedTx.updatedAt ?? a.decodedTx.createdAt ?? 0) -
        (b.decodedTx.updatedAt ?? b.decodedTx.createdAt ?? 0),
    );

    if (!isNil(tokenIdOnNetwork)) {
      result = result.filter(
        (tx) =>
          ([] as IDecodedTxAction[])
            .concat(tx.decodedTx.actions)
            .concat(tx.decodedTx.outputActions || [])
            .filter(
              (action) =>
                action &&
                this._checkIsActionIncludesToken({
                  historyTx: tx,
                  action,
                  tokenIdOnNetwork,
                }),
            ).length > 0,
      );
    }

    return result;
  }
}