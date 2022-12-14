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

type task<F extends (...agrs: any[]) => any> = {
  args: Parameters<F>;
  resolve: (value: ReturnType<F>) => void;
  reject: (err: string) => void;
};

type traceItem<F extends (...agrs: any[]) => any> = {
  resolve: (value: ReturnType<F>) => void;
  reject: (err: string) => void;
  workerState: workerState;
};

export const useWorker = <F extends func>(
  func: F,
  maxConcurrency: number = 1
): workerFunc<F> => {
  const concurrency = maxConcurrency;
  if (concurrency < 1) {
    const res: Async<F> = (...args) => Promise.resolve(func(...args));
    return res;
  }
  // worker ๅ็ js
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

  // worker ๅ่กจ
  const workerStateList: workerState[] = [];

  const taskQueue: Array<task<F>> = [];

  const traceTaskMap: Record<string, traceItem<F>> = {};

  const exec = (workerState: workerState) => {
    if (workerState.settingCount) {
      return;
    }
    const argItem = taskQueue[0];
    if (!argItem) {
      return;
    } else {
      taskQueue.shift();
    }
    // ็จ worker ๆง่กๅฝๆฐ
    const { args, resolve, reject } = argItem;
    const traceId = getTraceId();
    workerState.settingCount++;
    traceTaskMap[traceId] = {
      resolve,
      reject,
      workerState,
    };
    workerState.worker.postMessage({ args, traceId });
  };

  const handleMessage = (
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
    const traceItem = traceTaskMap[e.data.traceId];

    if (!traceItem) {
      return;
    }
    const { resolve, reject, workerState } = traceItem;
    switch (e.data.type) {
      case "setup":
        workerState.settingCount--;
        // ๅฆๆๅฝๅworker็ฉบไบ ๅนถไธ้ๅ้ๆๅๆฐ๏ผๆง่ก
        if (workerState.settingCount === 0) {
          exec(workerState);
        }
        break;
      case "resolve":
        delete traceTaskMap[e.data.traceId];
        resolve(e.data.data);
        break;
      case "reject":
        delete traceTaskMap[e.data.traceId];
        reject(e.data.error);
        break;
    }
  };

  for (let i = 0; i < concurrency; i++) {
    const worker = new Worker(
      `data:application/javascript,${messageHandlerString}`
    );

    //
    worker.onmessage = handleMessage;
    //
    workerStateList.push({ worker, settingCount: 0 });
  }

  const terminate = () =>
    workerStateList.forEach((item) => item.worker.terminate());

  const workerFunc: workerFunc<F> = (
    ...args: Parameters<F>
  ): Promise<ReturnType<F>> => {
    const promise = new Promise<ReturnType<F>>((resolve, reject) => {
      taskQueue.push({ args, resolve, reject });
      // ๅฆๆๆ็ฉบ้ฒworker็ซๅณๆง่กใ
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
