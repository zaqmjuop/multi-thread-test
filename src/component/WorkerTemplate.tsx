import React from "react";
import { useWorker } from "../utils/useWorker";
import { Switch, InputNumber, Button, Tag, Form, Input } from "antd";
import "./WorkerTemplate.scss";
import { Link } from "react-router-dom";

type func = (...args: any[]) => any;
interface WorkerTemplateProps {
  title: string;
  testData: { simpleFunc: func; args: any[] };
}

const maxConcurrency = navigator.hardwareConcurrency || 0;

class WorkerTemplate extends React.Component<WorkerTemplateProps> {
  state = {
    simpleFunc: (() => void 0) as func,
    funcString: "",
    funcStringError: "",
    workerFunc: (() => {}) as ReturnType<typeof useWorker>,
    concurrency: Math.min(maxConcurrency - 1, 2),
    running: false,
    syncScore: 0,
    workerScore: 0,
    syncAble: true,
    workerAble: true,
    settingCount: "",
    editConcurrency: false,
    editFunc: false,
    //
    args: [] as any[],
    editArgs: false,
    argsString: "",
    editArgsError: "",
  };
  constructor(props: WorkerTemplateProps) {
    super(props);
    const { simpleFunc, args } = props.testData;
    this.state.simpleFunc = simpleFunc;
    this.state.funcString = this.state.simpleFunc.toString();
    this.state.args = args;
    const workerFunc = useWorker(this.state.simpleFunc, this.state.concurrency);
    this.state.workerFunc = workerFunc;
  }

  simpleFuncPolling = async () => {
    if (!this.state.running || !this.state.syncAble) {
      return;
    }
    const { simpleFunc, args } = this.state;
    await simpleFunc(...args);
    if (!this.state.running || !this.state.syncAble) {
      return;
    }
    this.state.syncScore++;
    this.setState({});
    return setTimeout(() => this.simpleFuncPolling());
  };

  workerPollingItem = async (): Promise<any> => {
    if (!this.state.running || !this.state.workerAble) {
      return;
    }
    await this.state.workerFunc(...this.state.args);

    if (!this.state.running || !this.state.workerAble) {
      return;
    }
    this.state.workerScore++;
    this.state.settingCount =
      this.state.workerFunc.getSettingCount?.() || this.state.settingCount;
    this.setState({});
    return this.state.concurrency >= 1
      ? this.workerPollingItem()
      : setTimeout(() => this.workerPollingItem());
  };

  workerPolling = async () => {
    if (!this.state.running || this.state.concurrency < 1) {
      return;
    }
    for (let i = 0; i < this.state.concurrency; i++) {
      this.workerPollingItem();
    }
  };

  play = async () => {
    await this.setState({ running: true });
    this.simpleFuncPolling();
    this.workerPolling();
  };

  pause = () => {
    this.setState({ running: false });
  };

  reset = () => {
    this.setState({
      running: false,
      syncScore: 0,
      workerScore: 0,
      syncAble: true,
      workerAble: true,
      settingCount: "",
    });
  };

  componentWillUnmount = () => {
    this.state.workerFunc.terminate?.();
  };

  submitConcurrency = (concurrency: number) => {
    this.setState({ concurrency });
    this.initWorkerFunc();
  };

  initWorkerFunc = () => {
    const workerFunc = useWorker(this.state.simpleFunc, this.state.concurrency);
    this.state.workerFunc.terminate?.();
    this.reset();
    return this.setState({ workerFunc });
  };

  toggleEditConcurrency = () => {
    return this.setState({
      running: false,
      editConcurrency: !this.state.editConcurrency,
    });
  };

  editFuncString = () => {
    return this.setState({
      editFunc: true,
      funcString: this.state.simpleFunc.toString(),
      funcStringError: "",
    });
  };

  submitFuncString = async () => {
    const funcString = this.state.funcString;
    try {
      const simpleFunc = eval(funcString);
      if (typeof simpleFunc === "function") {
        await this.setState({
          simpleFunc,
          funcStringError: "",
          editFunc: false,
        });
        return this.initWorkerFunc();
      } else {
        this.setState({ funcStringError: `????????????function` });
      }
    } catch (error) {
      this.setState({ funcStringError: `${error}` });
    }
  };

  editArgs = () => {
    return this.setState({
      editArgs: true,
      argsString: JSON.stringify(this.state.args),
      editArgsError: "",
    });
  };

  submitEditArgs = () => {
    const argsString = this.state.argsString;
    try {
      const args = JSON.parse(argsString);
      if (Array.isArray(args)) {
        this.setState({
          args,
          editArgs: false,
          argsString: "",
          editArgsError: "",
        });
        return this.reset();
      } else {
        this.setState({ editArgsError: `????????????Array` });
      }
    } catch (error) {
      this.setState({ editArgsError: `${error}` });
    }
  };

  render() {
    const ratio = (
      this.state.workerScore / (this.state.syncScore || 1)
    ).toFixed(1);

    const concurrencyForm = this.state.editConcurrency ? (
      <span className="flex-center">
        <InputNumber
          min={0}
          max={maxConcurrency}
          defaultValue={this.state.concurrency}
          onChange={(val: number | null) =>
            this.setState({
              concurrency: val || 0,
            })
          }
        />
        <Button
          key={"??????"}
          type="primary"
          onClick={() => {
            this.submitConcurrency(this.state.concurrency);
            this.toggleEditConcurrency();
          }}
        >
          ??????
        </Button>
        <Button key={"??????"} onClick={this.toggleEditConcurrency}>
          ??????
        </Button>
      </span>
    ) : (
      <span className="flex-center">
        <Tag color="volcano"> {this.state.concurrency}</Tag>
        <Button
          key={"??????"}
          type="primary"
          onClick={this.toggleEditConcurrency}
        >
          ??????
        </Button>
      </span>
    );

    const funcForm = this.state.editFunc ? (
      <Form layout="inline">
        <Button key={"submit"} type="primary" onClick={this.submitFuncString}>
          ??????
        </Button>
        <Button
          key={"cancel"}
          onClick={() => this.setState({ editFunc: !this.state.editFunc })}
        >
          ??????
        </Button>
        <Input.TextArea
          value={this.state.funcString}
          rows={24}
          onInput={(event: any) => {
            const value = event?.target?.value;
            if (typeof value === "string") {
              this.setState({ funcString: value });
            }
          }}
        ></Input.TextArea>
        <span style={{ color: "#f00" }}> {this.state.funcStringError}</span>
      </Form>
    ) : (
      <div style={{ textAlign: "left" }}>
        <Button key={"edit"} type="link" onClick={this.editFuncString}>
          ??????
        </Button>
        <div>
          {this.state.simpleFunc
            .toString()
            .split(/\n/)
            .map((str, index) => {
              return <p key={index}>{str}</p>;
            })}
        </div>
      </div>
    );

    const argsForm = this.state.editArgs ? (
      <div>
        <Form layout="inline">
          <Button key={"submit"} type="primary" onClick={this.submitEditArgs}>
            ??????
          </Button>
          <Button
            key={"cancel"}
            onClick={() => this.setState({ editArgs: !this.state.editArgs })}
          >
            ??????
          </Button>
          <Input.TextArea
            value={this.state.argsString}
            rows={8}
            onInput={(event: any) => {
              const value = event?.target?.value;
              if (typeof value === "string") {
                this.setState({ argsString: value });
              }
            }}
          ></Input.TextArea>
          <span style={{ color: "#f00" }}> {this.state.editArgsError}</span>
        </Form>
      </div>
    ) : (
      <div>
        <Button key={"edit"} type="link" onClick={this.editArgs}>
          ??????
        </Button>
        <p> {JSON.stringify(this.state.args)}</p>
      </div>
    );

    return (
      <div className="worker-template">
        <div>
          <div className="flex-center">
            <Link to={"/"}>??????</Link>
            <h1 style={{ flexGrow: 1 }}>{this.props.title}</h1>
          </div>

          <p style={{ textAlign: "left" }}>
            ?????????????????????????????????<Tag color="purple">{maxConcurrency}</Tag>
          </p>
          <p className="flex-justify" style={{ textAlign: "left" }}>
            <span>??????worker????????????</span>
            {concurrencyForm}
          </p>
        </div>
        <ul>
          <li className="row flex-justify">
            <span>
              ????????????
              <Switch
                checked={this.state.syncAble}
                onChange={() =>
                  this.setState({
                    syncAble: !this.state.syncAble,
                  })
                }
              />
            </span>
            <span>
              ????????????: <Tag color="blue">{this.state.syncScore}</Tag>
            </span>
          </li>
          <li className="row flex-justify">
            <span>
              worker?????????
              <Switch
                checked={this.state.workerAble}
                onChange={() =>
                  this.setState({
                    workerAble: !this.state.workerAble,
                  })
                }
              />
            </span>
            <span>
              ????????????: <Tag color="magenta">{this.state.workerScore}</Tag>
            </span>
          </li>
          <li className="row flex-justify">
            <span>worker???????????????????????????</span>
            <span>
              <Tag color="cyan">{ratio}</Tag>
            </span>
          </li>
          <li className="row">
            <span>?????????????????????</span>
            <span>{this.state.settingCount}</span>
          </li>
        </ul>
        <div>
          <Button
            type="primary"
            disabled={this.state.running}
            onClick={() => this.play()}
          >
            ??????
          </Button>
          <Button disabled={!this.state.running} onClick={() => this.pause()}>
            ??????
          </Button>
          <Button onClick={() => this.reset()}>??????</Button>
        </div>
        <div>
          <p>?????????</p>
          {funcForm}
        </div>
        <div>
          <p>?????????</p>
          <div style={{ textAlign: "left" }}>{argsForm}</div>
        </div>
      </div>
    );
  }
}
export default WorkerTemplate;
