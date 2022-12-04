type func = (...agrs: any[]) => any;
export const getConcurrency = () =>
  Number(
    "Worker" in self &&
      /Chrome/.test(navigator.userAgent) &&
      navigator.hardwareConcurrency
  );

const idGetter = () => {
  let id = 0;
  return () => {
    id > 65535 && (id = -id);
    return `${id++}`;
  };
};
const getTraceId = idGetter();

type Async<F extends (...agrs: any[]) => any> = (
  ...args: Parameters<F>
) => Promise<ReturnType<F>>;

type workerFunc<F extends (...agrs: any[]) => any> = Async<F> & {
  terminate?: () => void;
  getSettingCount?: () => string;
};

type workerState = { worker: Worker; settingCount: number };

export const useWorker = <F extends func>(
  func: F,
  maxConcurrency: number = 1
): workerFunc<F> => {
  const concurrency = maxConcurrency;
  if (concurrency < 1) {
    const res: Async<F> = (...args) => Promise.resolve(func(...args));
    return res;
  }
  // worker 内的 js
  const messageHandlerString = encodeURIComponent(`
  const func = ${func.toString()};
  onmessage = async (event) => {
    const { traceId, args } = event.data;
    try {
      const promise = func.apply(void 0, args);
      postMessage({ traceId, type: 'setup' });
      const data = await promise;
      self.postMessage({ traceId, type: 'resolve', data });
    } catch (error) {
      self.postMessage({ traceId, type: 'reject', error: error.toString() });
    }
  };
`);

  // worker 列表
  const workerStateList: workerState[] = [];
  for (let i = 0; i < concurrency; i++) {
    const worker = new Worker(
      `data:application/javascript,${messageHandlerString}`
    );
    workerStateList.push({ worker, settingCount: 0 });
  }

  const terminate = () =>
    workerStateList.forEach((item) => item.worker.terminate());

  const argList: Array<{
    args: Parameters<F>;
    resolve: (value: ReturnType<F>) => void;
    reject: (err: string) => void;
  }> = [];

  const exec = (workerState: workerState) => {
    if (workerState.settingCount) {
      return;
    }
    const argItem = argList[0];
    if (!argItem) {
      return;
    } else {
      argList.shift();
    }
    // 用 worker 执行函数
    const { args, resolve, reject } = argItem;
    const traceId = getTraceId();
    const handler = (
      e: MessageEvent<
        | {
            traceId: string;
            type: "setup";
          }
        | {
            traceId: string;
            type: "reject";
            error: string;
          }
        | {
            traceId: string;
            type: "resolve";
            data: ReturnType<F>;
          }
      >
    ) => {
      if (e.data.traceId !== traceId) {
        return;
      }
      switch (e.data.type) {
        case "setup":
          workerState.settingCount--;
          // 如果当前worker空了 并且队列里有参数，执行
          if (workerState.settingCount===0) {
            exec(workerState);
          }
          break;
        case "resolve":
          workerState.worker.removeEventListener("message", handler);
          resolve(e.data.data);
          break;
        case "reject":
          workerState.worker.removeEventListener("message", handler);
          reject(e.data.error);
          break;
      }
    };
    workerState.worker.addEventListener("message", handler);
    workerState.settingCount++;
    workerState.worker.postMessage({ args, traceId });
  };

  const workerFunc: workerFunc<F> = (
    ...args: Parameters<F>
  ): Promise<ReturnType<F>> => {
    const promise = new Promise<ReturnType<F>>((resolve, reject) => {
      argList.push({ args, resolve, reject });
      // 如果有空闲worker立即执行。
      const workerStateIndex = workerStateList.findIndex(
        (item) => item.settingCount === 0
      );
      const workerState = workerStateList[workerStateIndex];
      if (workerState) {
        exec(workerState);
        workerStateList.splice(workerStateIndex, 1);
        workerStateList.push(workerState);
      }
    });
    return promise;
  };

  workerFunc.terminate = terminate;

  workerFunc.getSettingCount = () => {
    return workerStateList.map((item) => item.settingCount).join(",");
  };

  return workerFunc;
};
