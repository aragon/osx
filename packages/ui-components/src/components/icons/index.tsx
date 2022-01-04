export * from './interface';
export * from './module';

export type IconType = ({
  height,
  width,
  ...props
}: {
  // eslint-disable-next-line
  [x: string]: any;
  height?: number | undefined;
  width?: number | undefined;
}) => JSX.Element;

// TODO Icon sizes and view ports are off. Had to hard code some changes. Should
// be discussed and improved ASAP [VR 12-11-2021]
