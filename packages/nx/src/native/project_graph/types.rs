use crate::native::types::JsInputs;
use std::collections::HashMap;

#[napi(object)]
pub struct ExternalNodeData {
    pub version: String,
    pub hash: String,
}

#[napi(object)]
pub struct ExternalNode {
    pub version: String,
    pub hash: String,
}

#[napi(object)]
pub struct Target {
    pub executor: Option<String>,
    pub inputs: Option<Vec<JsInputs>>,
    pub outputs: Option<Vec<String>>,
}

#[napi(object)]
pub struct Project {
    pub root: String,
    pub named_inputs: Option<HashMap<String, Vec<JsInputs>>>,
    pub targets: HashMap<String, Target>,
}

#[napi(object)]
pub struct ProjectGraph {
    pub nodes: HashMap<String, Project>,
    pub dependencies: HashMap<String, Vec<String>>,
    pub external_nodes: HashMap<String, ExternalNode>,
}
