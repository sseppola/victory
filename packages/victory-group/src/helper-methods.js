/* eslint-disable func-style */
/* eslint-disable no-use-before-define */
import { assign } from "lodash";
import React from "react";
import { Helpers, Scale, Data, Wrapper } from "victory-core";

const fallbackProps = {
  width: 450,
  height: 300,
  padding: 50,
  offset: 0
};

// eslint-disable-next-line max-statements
function getCalculatedProps(props, childComponents) {
  const role = "group";
  props = Helpers.modifyProps(props, fallbackProps, role);
  const style = Wrapper.getStyle(props.theme, props.style, role);
  const { offset, colorScale, color, polar, horizontal } = props;
  const categories = props.categories || Wrapper.getCategories(props, childComponents);
  const datasets = props.datasets || Wrapper.getDataFromChildren(props);
  const domain = {
    x: Wrapper.getDomain(assign({}, props, { categories }), "x", childComponents),
    y: Wrapper.getDomain(assign({}, props, { categories }), "y", childComponents)
  };
  const range = props.range || {
    x: Helpers.getRange(props, "x"),
    y: Helpers.getRange(props, "y")
  };
  const baseScale = {
    x: Scale.getScaleFromProps(props, "x") || Wrapper.getScale(props, "x"),
    y: Scale.getScaleFromProps(props, "y") || Wrapper.getScale(props, "y")
  };
  const scale = {
    x: baseScale.x.domain(domain.x).range(props.horizontal ? range.y : range.x),
    y: baseScale.y.domain(domain.y).range(props.horizontal ? range.x : range.y)
  };

  const origin = polar ? props.origin : Helpers.getPolarOrigin(props);
  const padding = Helpers.getPadding(props);
  return {
    datasets,
    categories,
    range,
    domain,
    horizontal,
    scale,
    style,
    colorScale,
    color,
    offset,
    origin,
    padding
  };
}

function pixelsToValue(props, axis, calculatedProps) {
  if (!props.offset) {
    return 0;
  }
  const currentAxis = Helpers.getCurrentAxis(axis, props.horizontal);
  const domain = calculatedProps.domain[axis];
  const range = calculatedProps.range[currentAxis];
  const domainExtent = Math.max(...domain) - Math.min(...domain);
  const rangeExtent = Math.max(...range) - Math.min(...range);
  return (domainExtent / rangeExtent) * props.offset;
}

function getX0(props, calculatedProps, index) {
  const center = (calculatedProps.datasets.length - 1) / 2;
  const totalWidth = pixelsToValue(props, "x", calculatedProps);
  return (index - center) * totalWidth;
}

function getPolarX0(props, calculatedProps, index) {
  const center = (calculatedProps.datasets.length - 1) / 2;
  const width = getAngularWidth(props, calculatedProps);
  return (index - center) * width;
}

function getAngularWidth(props, calculatedProps) {
  const { range } = calculatedProps;
  const angularRange = Math.abs(range.x[1] - range.x[0]);
  const r = Math.max(...range.y);
  return (props.offset / (2 * Math.PI * r)) * angularRange;
}

function getLabels(props, datasets, index) {
  if (!props.labels) {
    return undefined;
  }
  return Math.floor(datasets.length / 2) === index ? props.labels : undefined;
}

function getChildProps(props, calculatedProps) {
  const { categories, domain, range, scale, horizontal, origin, padding } = calculatedProps;
  const { width, height, theme, polar } = props;
  return {
    height,
    width,
    theme,
    polar,
    origin,
    categories,
    domain,
    range,
    scale,
    horizontal,
    padding,
    standalone: false
  };
}

function getColorScale(props, child) {
  const role = child.type && child.type.role;
  const colorScaleOptions = child.props.colorScale || props.colorScale;
  if (role !== "group" && role !== "stack") {
    return undefined;
  }
  return props.theme && props.theme.group
    ? colorScaleOptions || props.theme.group.colorScale
    : colorScaleOptions;
}

function getDataWithOffset(props, defaultDataset = [], offset) {
  const dataset = props.data || props.y ? Data.getData(props) : defaultDataset;
  const xOffset = offset || 0;
  return dataset.map((datum) => {
    const _x1 =
      datum._x instanceof Date ? new Date(datum._x.getTime() + xOffset) : datum._x + xOffset;

    return assign({}, datum, { _x1 });
  });
}

function getChildren(props, childComponents, calculatedProps) {
  props = Helpers.modifyProps(props, fallbackProps, "stack");
  childComponents = childComponents || React.Children.toArray(props.children);
  calculatedProps = calculatedProps || getCalculatedProps(props, childComponents);
  const { datasets } = calculatedProps;
  const { labelComponent, polar } = props;
  const childProps = getChildProps(props, calculatedProps);
  const parentName = props.name || "group";
  return childComponents.map((child, index) => {
    const role = child.type && child.type.role;
    const xOffset = polar
      ? getPolarX0(props, calculatedProps, index)
      : getX0(props, calculatedProps, index);
    const style =
      role === "voronoi" || role === "tooltip" || role === "label"
        ? child.props.style
        : Wrapper.getChildStyle(child, index, calculatedProps);
    const labels = props.labels ? getLabels(props, datasets, index) : child.props.labels;
    const name = child.props.name || `${parentName}-${role}-${index}`;
    return React.cloneElement(
      child,
      assign(
        {
          labels,
          style,
          key: `${name}-key-${index}`,
          name,
          data: getDataWithOffset(props, datasets[index], xOffset),
          colorScale: getColorScale(props, child),
          labelComponent: labelComponent || child.props.labelComponent,
          xOffset: role === "stack" ? xOffset : undefined
        },
        childProps
      )
    );
  });
}

export { getChildren, getCalculatedProps };
