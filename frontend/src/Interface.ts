import { IMainState, ISettingState } from "./Reducer";
export interface ILogItem {
  src: string;
  content: string;
  time: string;
  state: {
    showViewer: boolean;
    Src: string;
  };
  onState: React.Dispatch<
    React.SetStateAction<{
      showViewer: boolean;
      Src: string;
    }>
  >;
}

export interface IClickPos {
  X: number;
  Y: number;
}

export interface ISelect {
  mainReducer: IMainState;
  settingReducer: ISettingState;
}

export interface IDetectData {
  thumbnail: string;
  content: string;
  time: string;
}
