import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { atom, createStore, useAtom } from 'jotai';

import type {
  IJotaiRead,
  IJotaiWrite,
} from '@onekeyhq/kit-bg/src/states/jotai/types';
import {
  contextAtomBase,
  contextAtomComputedBase,
  contextAtomMethodBase,
} from '@onekeyhq/kit-bg/src/states/jotai/utils';

import type { WritableAtom } from 'jotai';

export { atom };

export type IJotaiContextStore = ReturnType<typeof createStore>;

export function createJotaiContext<TContextConfig = undefined>() {
  // 创建React Context存储Jotai store和配置
  const Context = createContext<{
    store: IJotaiContextStore | undefined;
    config: TContextConfig | undefined;
  }>({ store: undefined, config: undefined });

  // 创建Provider组件来传递store和配置
  function Provider({
    config,
    store,
    children,
  }: {
    config?: TContextConfig;
    store?: IJotaiContextStore;
    children?: ReactNode | undefined;
  }) {
    const value = useMemo(() => {
      const s = store || createStore();
      return { store: s, config };
    }, [store, config]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }
  // 创建高阶组件 使组件可以访问Jotai store
  function withProvider<P>(WrappedComponent: React.ComponentType<P>) {
    return function WithProvider(
      props: P,
      {
        store,
        config,
      }: {
        config?: TContextConfig;
        store?: IJotaiContextStore;
      } = {},
    ) {
      return (
        <Provider store={store} config={config}>
          <WrappedComponent {...(props as any)} />
        </Provider>
      );
    };
  }

  // 获取上下文数据的Hook
  function useContextData() {
    const data = useContext(Context);
    if (!data?.store) {
      throw new Error('useContextStore ERROR: store not initialized');
    }
    return data;
  }

  // 用于在特定store中使用atom的Hook
  function useContextAtom<Value, Args extends any[], Result>(
    atomInstance: WritableAtom<Value, Args, Result>,
  ) {
    const data = useContextData();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return useAtom(atomInstance, { store: data.store! });
  }

  // 三个工具函数，用于创建不同类型的atom 普通值，计算属性和方法
  function contextAtom<Value>(initialValue: Value) {
    return contextAtomBase({
      useContextAtom,
      initialValue,
    });
  }

  function contextAtomComputed<Value>(read: IJotaiRead<Value>) {
    return contextAtomComputedBase({
      useContextAtom: useContextAtom as any,
      read,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function contextAtomMethod<Value, Args extends unknown[], Result>(
    fn: IJotaiWrite<Args, Result>,
  ) {
    return contextAtomMethodBase({
      useContextAtom,
      fn,
    });
  }

  return {
    Context,
    Provider,
    withProvider,
    useContextAtom,
    useContextData,
    contextAtom,
    contextAtomMethod,
    contextAtomComputed,
  };
}
