import React from "react";
import { useWorker } from "../utils/useWorker";
import { Switch, InputNumber, Button, Tag } from "antd";
import "./WorkerTemplate.scss";
import { Link } from "react-router-dom";

interface WorkerTemplateProps {
  title: string;
  testData: { simpleFunc: (...args: any[]) => any; args: any[] };
}

const maxConcurrency = 3; // navigator.hardwareConcurrency || 0;

class WorkerTemplate extends React.Component<WorkerTemplateProps> {
  state = {
    workerFunc: (() => {}) as ReturnType<typeof useWorker>,
    concurrency: maxConcurrency - 1,
    running: false,
    syncScore: 0,
    workerScore: 0,
    syncAble: true,
    workerAble: true,
    settingCount: "",
    editConcurrency: false,
  };
  constructor(props: WorkerTemplateProps) {
    super(props);
    const workerFunc = useWorker(
      props.testData.simpleFunc,
      this.state.concurrency
    );
    this.state.workerFunc = workerFunc;
  }

  simpleFuncPolling = async () => {
    if (!this.state.running || !this.state.syncAble) {
      return;
    }
    const { simpleFunc, args } = this.props.testData;
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
    await this.state.workerFunc(...this.props.testData.args);

    if (!this.state.running || !this.state.workerAble) {
      return;
    }
    this.state.workerScore++;
    this.state.settingCount =
      this.state.workerFunc.getSettingCount?.() || this.state.settingCount;
    this.setState({});
    return this.state.concurrency >= 1
      ? this.workerPolling()
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
    });
  };

  componentWillUnmount = () => {
    this.state.workerFunc.terminate?.();
  };

  submitConcurrency = (concurrency: number) => {
    this.state.workerFunc.terminate?.();
    this.reset();
    const workerFunc = useWorker(this.props.testData.simpleFunc, concurrency);
    return this.setState({ workerFunc, concurrency });
  };

  toggleEditConcurrency = () => {
    return this.setState({
      running: false,
      editConcurrency: !this.state.editConcurrency,
    });
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
          key={"修改"}
          type="primary"
          onClick={() => {
            this.submitConcurrency(this.state.concurrency);
            this.toggleEditConcurrency();
          }}
        >
          修改
        </Button>
        <Button key={"取消"} onClick={this.toggleEditConcurrency}>
          取消
        </Button>
      </span>
    ) : (
      <span className="flex-center">
        <Tag color="volcano"> {this.state.concurrency}</Tag>
        <Button
          key={"变更"}
          type="primary"
          onClick={this.toggleEditConcurrency}
        >
          变更
        </Button>
      </span>
    );

    return (
      <div className="worker-template">
        <div>
          <div className="flex-center">
            <Link to={'/'}>首页</Link>
            <h1 style={{flexGrow: 1}}>{this.props.title}</h1>
          </div>
      
          <p style={{ textAlign: "left" }}>
            当前浏览器最大并发数：<Tag color="purple">{maxConcurrency}</Tag>
          </p>
          <p className="flex-justify" style={{ textAlign: "left" }}>
            <span>设置worker并发数：</span>
            {concurrencyForm}
          </p>
        </div>
        <ul>
          <li className="row flex-justify">
            <span>
              主线程：
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
              运行次数: <Tag color="blue">{this.state.syncScore}</Tag>
            </span>
          </li>
          <li className="row flex-justify">
            <span>
              worker线程：
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
              运行次数: <Tag color="magenta">{this.state.workerScore}</Tag>
            </span>
          </li>
          <li className="row flex-justify">
            <span>worker线程照比主线程比率</span>
            <span>
              <Tag color="cyan">{ratio}</Tag>
            </span>
          </li>
          <li className="row">
            <span>负担数</span>
            <span>{this.state.settingCount}</span>
          </li>
        </ul>
        <div>
          <Button
            type="primary"
            disabled={this.state.running}
            onClick={() => this.play()}
          >
            运行
          </Button>
          <Button disabled={!this.state.running} onClick={() => this.pause()}>
            暂停
          </Button>
          <Button onClick={() => this.reset()}>复位</Button>
        </div>
        <div>
          <p>函数：</p>
          <div style={{ textAlign: "left" }}>
            {this.props.testData.simpleFunc.toString()}
          </div> 
        </div>
        <div>
          <p>参数：</p>
          <div
            style={{ textAlign: "left" }}
          >{`${this.props.testData.args}`}</div>
        </div>
      </div>
    );
  }
}
export default WorkerTemplate;
