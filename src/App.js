import React, { useEffect, useState, useReducer } from "react";
import "./App.css";
import "@aws-amplify/ui/dist/style.css";

import { listTalks as ListTalks } from "./graphql/queries";
import {
  createTalk as CreateTalk,
  deleteTalk as DeleteTalk,
} from "./graphql/mutations";
import { onCreateTalk as OnCreateTalk } from "./graphql/subscriptions";

import { API, graphqlOperation, Auth } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { v4 as uuidv4 } from "uuid";

const CLIENT_ID = uuidv4();

const initialState = {
  name: "",
  description: "",
  speakerName: "",
  speakerBio: "",
  talks: [],
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_TALKS":
      return { ...state, talks: action.talks };
    case "SET_INPUT":
      return { ...state, [action.key]: action.value };
    case "CLEAR_INPUT":
      return { ...initialState, talks: state.talks };
    case "ADD_TALK":
      return { ...initialState, talks: [...state.talks, action.talk] };
    case "DELETE_TALK":
      console.log(state.talks.filter((item) => item.id !== action.talk.id));
      return {
        ...initialState,
        talks: state.talks.filter((item) => item.id !== action.talk.id),
      };
    default:
      return state;
  }
};

function App() {
  const [user, setUser] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    checkUser();
    getTalks();
    const subscription = API.graphql(graphqlOperation(OnCreateTalk)).subscribe({
      next: (eventData) => {
        const talk = eventData.value.data.onCreateTalk;

        if (talk.clientId === CLIENT_ID) return;

        dispatch({ type: "ADD_TALK", talk });
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const getTalks = async () => {
    try {
      const talkData = await API.graphql(graphqlOperation(ListTalks));
      // console.log(talkData.data.listTalks);
      dispatch({ type: "SET_TALKS", talks: talkData.data.listTalks.items });
    } catch (error) {
      console.log(`Error : `, error);
    }
  };

  const createTalks = async () => {
    const { name, description, speakerBio, speakerName } = state;

    if (
      name === "" ||
      description === "" ||
      speakerBio === "" ||
      speakerName === ""
    ) {
      return;
    }

    const talk = {
      name,
      description,
      speakerBio,
      speakerName,
      clientId: CLIENT_ID,
      id: CLIENT_ID,
    };
    const talks = [...state.talks, talk];

    dispatch({ type: "SET_TALKS", talks });
    dispatch({ type: "CLEAR_INPUT" });

    try {
      await API.graphql(graphqlOperation(CreateTalk, { input: talk }));
      console.log(`New talk created`);
    } catch (error) {
      console.log(`Error : `, error);
    }
  };

  const onDeleteTalk = async (talk) => {
    dispatch({ type: "DELETE_TALK", talk });

    try {
      const removeTalk = await API.graphql(
        graphqlOperation(DeleteTalk, { input: { id: talk.id } })
      );
      console.log(`This talk deleted: `, removeTalk.data);
    } catch (error) {
      console.log(`Error : `, error);
    }
  };

  const onChange = (e) => {
    dispatch({ type: "SET_INPUT", key: e.target.name, value: e.target.value });
  };

  const checkUser = async () => {
    Auth.currentAuthenticatedUser()
      .then((user) => setUser(user))
      .catch(() => console.log("Not signed in"));
  };

  return (
    <div className='App'>
      <header className='App-header'>
        {!!!user.username ? (
          <button onClick={() => Auth.federatedSignIn()}>Sign in</button>
        ) : (
          <button onClick={() => Auth.signOut()}>Sign out</button>
        )}
        <div>
          <input
            name='name'
            onChange={onChange}
            value={state.name}
            placeholder='name'
          />
          <input
            name='description'
            onChange={onChange}
            value={state.description}
            placeholder='description'
          />
          <input
            name='speakerName'
            onChange={onChange}
            value={state.speakerName}
            placeholder='speaker name'
          />
          <input
            name='speakerBio'
            onChange={onChange}
            value={state.speakerBio}
            placeholder='speaker bio'
          />
          <button onClick={createTalks}>Create</button>
        </div>
        {state.talks.map((talk) => {
          return (
            <div
              key={talk.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                width: "70%",
                justifyContent: "space-between",
                padding: "20px",
                borderBottom: "1px solid",
              }}>
              <div>
                <h1>{talk.name}</h1>
                <h2>{talk.speakerBio}</h2>
                <p>{talk.description}</p>
              </div>
              <button onClick={() => onDeleteTalk(talk)}>Delete</button>
            </div>
          );
        })}
      </header>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
